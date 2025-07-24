const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
dotenvExpand.expand(dotenv.config());
const axios = require('axios');
const commandLineArgs = require('command-line-args');

// --- 設定値 ---
const FIWARE_ORION_URL = process.env.FIWARE_ORION_URL; // /ngsi-ld/v1 エンドポイント
const FIWARE_QUANTUM_LEAP_URL = process.env.FIWARE_QUANTUM_LEAP_URL; // /v2 エンドポイント
const FIWARE_ENTITY_TYPE = process.env.FIWARE_ENTITY_TYPE;
const FIWARE_ENTITY_ID = process.env.FIWARE_ENTITY_ID;
const FIWARE_SERVICE = process.env.FIWARE_SERVICE;
const FIWARE_SERVICE_PATH = process.env.FIWARE_SERVICE_PATH;
const FIWARE_CONTEXT = process.env.FIWARE_CONTEXT;

const STATION_NAME = process.env.STATION_NAME;
const STATION_ID = process.env.STATION_ID;
const STATION_LAT = process.env.STATION_LAT;
const STATION_LON = process.env.STATION_LON;

const SEND_INTERVAL_MS = process.env.SEND_INTERVAL_MS || 5000; // FIWAREにデータを送信する間隔 (ミリ秒)

const NORMAL_BASE_LEVEL = 1.0; // 平常時のベース水位 (メートル)
const RAINSTORM_BASE_LEVEL = 5.0; // 豪雨時のベース水位 (メートル)
const LEVEL_FLUCTUATION_PERCENT = 0.05; // ベース水位からの±変動率 (5%)

const TRANSITION_DURATION_MINUTES = 5; // 状態移行にかかる時間 (分)
const TRANSITION_STEPS = (TRANSITION_DURATION_MINUTES * 60 * 1000) / SEND_INTERVAL_MS; // 移行ステップ数
const MIN_STATE_DURATION_MINUTES = 10; // 状態が最低継続する時間 (分)

// --- 状態管理変数 ---
let currentLevel = NORMAL_BASE_LEVEL; // 現在の水位
let currentState = 'normal'; // 現在の状態: 'normal' または 'rainstorm'
let targetBaseLevel = NORMAL_BASE_LEVEL; // 現在の状態の目標ベース水位
let nextState = 'normal'; // 次の状態 (移行中のみ使用)

let stateChangeStartTime = 0; // 状態が変化し始めたタイムスタンプ
let lastStateTransitionTime = Date.now(); // 最後に状態が移行したタイムスタンプ

let transitionStepCounter = 0; // 移行中のステップカウンター
let levelChangePerStep = 0; // 移行中のステップごとの水位変化量

// --- 引数 ---
const optionDefinitions = [
    {
        name: 'verbose',
        alias: 'v',
        type: Boolean
    }
];
const options = commandLineArgs(optionDefinitions);

// デバッグログ出力用(引数に-vを付けた時だけ出力する)
const debugLog = (options.verbose) ? console.log.bind(console) : () => { };


// --- ヘルパー関数 ---

/**
 * 乱数に基づいて次の状態を決定する (今回はランダム性を排除し、順序固定)
 * @returns {'normal' | 'rainstorm'} 次の状態
 */
function getNextRandomState() {
    return currentState === 'normal' ? 'rainstorm' : 'normal';
}

/**
 * 水位を計算し、現在の状態に基づいて変動させる
 * @param {number} baseLevel - 現在の状態のベース水位
 * @returns {number} 計算された水位
 */
function calculateLevel(baseLevel) {
    const fluctuation = baseLevel * LEVEL_FLUCTUATION_PERCENT;
    const randomOffset = (Math.random() * 2 - 1) * fluctuation; // -fluctuation から +fluctuation の範囲でランダムなオフセット
    return baseLevel + randomOffset;
}

/**
 * FIWAREに水位データを送信する
 * @param {number} level - 送信する水位データ
 */
async function sendLevelToFiware(level) {
    // NGSI-LDのデータ形式に変換
    const payload = {
        currentLevel: {
            type: 'Property',
            value: parseFloat(level.toFixed(2)), // 小数点以下2桁に丸める
            unitCode: 'MTR'
        },
        location: {
            type: 'GeoProperty',
            value: {
                type: 'Point',
                coordinates: [
                    parseFloat(STATION_LON),
                    parseFloat(STATION_LAT)
                ]
            }
        },
        name: {
            type: 'Property',
            value: STATION_NAME
        },
        observationDateTime: {
            type: 'Property',
            value: {
                '@type': 'DateTime',
                '@value': new Date().toISOString()
            }
        },
        stationID: {
            type: 'Property',
            value: STATION_ID
        }
    };

    const headers = {
        'Content-Type': 'application/json',
        'Fiware-Service': FIWARE_SERVICE,
        'Fiware-ServicePath': FIWARE_SERVICE_PATH,
        'Link': `<${FIWARE_CONTEXT}>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"`,
        'Accept': 'application/ld+json'
    };

    try {
        // エンティティがなければ作成、あればアップデート
        const createPayload = [{
            id: FIWARE_ENTITY_ID,
            type: FIWARE_ENTITY_TYPE,
            ...payload // payload に @context が含まれないようにする
        }];
        // debugLog(JSON.stringify(createPayload, null, 2));
        const upsertUrl = `${FIWARE_ORION_URL}/entityOperations/upsert`;
        await axios.post(upsertUrl, createPayload, { headers });
        debugLog(`[${new Date().toLocaleTimeString()}] Water level ${level.toFixed(2)}m (${currentState} state) sent to FIWARE.`);
    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] Error sending data to FIWARE:`, error.response ? error.response.data : error.message);
    }
}

// サブスクリプションが存在するかチェックしてから実行する
function fiwareSubscription() {
    const headers = {
        'Content-Type': 'application/ld+json',
        'NGSILD-Tenant': FIWARE_SERVICE
    };

    const subscriptionUrl = `${FIWARE_ORION_URL}/subscriptions`;
    axios.get(subscriptionUrl, { headers }).then(res => {
        const findData = res.data.find(item => {
            return item.entities[0].type.endsWith(FIWARE_ENTITY_TYPE);
        });
        if (typeof findData === "undefined") {
            // FIWARE_ENTITY_TYPEのサブスクがない
            sendSubscriptionToFiware();
        } else {
            console.log(`[${new Date().toLocaleTimeString()}] ${FIWARE_ENTITY_TYPE} already subscribed`);
        }
    }).catch(error => {
        if (error.response && error.response.status === 404) {
            // FIWARE_SERVICEのテナントが存在しない場合はこちら.
            sendSubscriptionToFiware();
        } else {
            console.error(`[${new Date().toLocaleTimeString()}] Error get subscription:`, error.response ? error.response.data : error.message);
        }
    });
}

/**
 * FIWAREに水位データのサブスクリプションを送信する
 */
function sendSubscriptionToFiware() {
    // NGSI-LDのデータ形式に変換
    const payload = {
        description: 'Notify me of all changes in river level',
        type: 'Subscription',
        entities: [{ 'type': FIWARE_ENTITY_TYPE }],
        watchedAttributes: ['currentLevel', 'observationDateTime'],
        notification: {
            attributes: ['currentLevel', 'location', 'name', 'observationDateTime', 'stationID'],
            format: 'normalized',
            endpoint: {
                uri: `${FIWARE_QUANTUM_LEAP_URL}/notify`,
                accept: 'application/json'
            }
        },
        '@context': `${FIWARE_CONTEXT}`
    };

    const headers = {
        'Content-Type': 'application/ld+json',
        'NGSILD-Tenant': FIWARE_SERVICE
    };

    try {
        const subscriptionUrl = `${FIWARE_ORION_URL}/subscriptions/`;
        axios.post(subscriptionUrl, payload, { headers });
        console.log(`[${new Date().toLocaleTimeString()}] ${FIWARE_ENTITY_TYPE} subscription sent to FIWARE.`);
    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] Error sending subscription to FIWARE:`, error.response ? error.response.data : error.message);
    }
}

/**
 * メインの実行ロジック
 */
function simulateRiverLevel() {
    const now = Date.now();

    // 状態移行中かどうかを判定
    const isTransitioning = stateChangeStartTime > 0 && transitionStepCounter <= TRANSITION_STEPS;

    if (isTransitioning) {
        // 状態移行中の水位計算
        currentLevel += levelChangePerStep;
        transitionStepCounter++;

        if (transitionStepCounter > TRANSITION_STEPS) {
            // 移行完了
            currentLevel = targetBaseLevel; // ぴったり目標水位に合わせる
            currentState = nextState;
            stateChangeStartTime = 0; // 移行終了
            transitionStepCounter = 0; // カウンターリセット
            console.log(`[${new Date().toLocaleTimeString()}] State transition complete. Current state: ${currentState}`);
        }
    } else {
        // 状態が安定している場合、現在のベース水位に基づいて変動
        currentLevel = calculateLevel(targetBaseLevel);

        // 状態変更の条件チェック
        const timeSinceLastTransition = now - lastStateTransitionTime;
        if (timeSinceLastTransition >= MIN_STATE_DURATION_MINUTES * 60 * 1000) {
            // 最低継続時間を過ぎたら、次の状態への移行を検討
            nextState = getNextRandomState(); // 次の状態を決定
            if (nextState !== currentState) {
                console.log(`[${new Date().toLocaleTimeString()}] Initiating state transition from ${currentState} to ${nextState}...`);
                stateChangeStartTime = now; // 移行開始時刻を記録
                lastStateTransitionTime = now; // 最後の状態移行時刻を更新

                // 移行目標ベース水位を設定
                targetBaseLevel = (nextState === 'normal') ? NORMAL_BASE_LEVEL : RAINSTORM_BASE_LEVEL;

                // ステップごとの水位変化量を計算
                levelChangePerStep = (targetBaseLevel - currentLevel) / TRANSITION_STEPS;
            }
        }
    }

    sendLevelToFiware(currentLevel);
}


// サブスクリプションの送信
fiwareSubscription();

// スクリプト開始時の初期設定
console.log(`[${new Date().toLocaleTimeString()}] Starting river level simulation...`);
console.log(`[${new Date().toLocaleTimeString()}] Initial state: ${currentState}, Base Level: ${NORMAL_BASE_LEVEL}m`);

// 定期的に水位シミュレーションと送信を実行
setInterval(simulateRiverLevel, SEND_INTERVAL_MS);
