import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import axios from 'axios';

// 環境変数の読み込み
const env = dotenv.config();
dotenvExpand.expand(env);

// --- 設定値 ---
const FIWARE_ORION_URL = process.env.FIWARE_ORION_URL || 'http://localhost/api/orion/ngsi-ld/v1';
const FIWARE_SERVICE = process.env.FIWARE_SERVICE || 'fresh_order_system';
const SEND_INTERVAL_MS = parseInt(process.env.SEND_INTERVAL_MS || '200');

// --- 型定義 ---
type PackageType = 'FROZEN' | 'FRESH';
type Variety = 'HERITAGE' | 'CHILCOTIN' | 'YELLOW' | 'HANOVER';

interface ProductionPlan {
  id: string;
  planNumber: number;
  producerId: string;
  shippingMonth: number;
  shippingWeek: number;
  packageType: PackageType;
  variety: Variety;
  quantity: number;
  pricePerKg: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ShippingSchedule {
  id: string;
  scheduleNumber: number;
  producerId: string;
  shippingMonth: number;
  shippingWeek: number;
  packageType: PackageType;
  variety: Variety;
  quantity: number;
  pricePerKg: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Inventory {
  id: string;
  producerId: string;
  packageType: PackageType;
  variety: Variety;
  quantity: number;
  pricePerKg: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  id: string;
  __typename: string;
  createdAt: string;
  updatedAt: string;
  customerId: string;
  packageType: PackageType;
  variety: Variety;
  quantity: number;
  pricePerKg: number;
  totalAmount: number;
  desiredDeliveryDate: string;
  status: string;
  orderNumber: number;
}

// --- 定数 ---
const VARIETIES: Variety[] = ['HERITAGE', 'CHILCOTIN', 'YELLOW', 'HANOVER'];
const PACKAGE_TYPES: PackageType[] = ['FROZEN', 'FRESH'];

// 単価設定
const PRICES: Record<Variety, number> = {
  HERITAGE: 4500,
  CHILCOTIN: 5000,
  YELLOW: 5500,
  HANOVER: 6000,
};

// 生鮮の出荷可能月
const FRESH_SHIPPING_MONTHS: Record<Variety, number[]> = {
  HERITAGE: [7, 10, 11, 12],
  CHILCOTIN: [7, 8],
  YELLOW: [6, 7],
  HANOVER: [6],
};

// 生産者ID（4名）
const PRODUCER_IDS = [
  'Uaa107a8c12079cf1b823bb3332067227',
  'U1234567890abcdef1234567890abcdef',
  'Uabcdef1234567890abcdef1234567890',
  'U9876543210fedcba9876543210fedcba',
];

// 顧客ID（10名）
const CUSTOMER_IDS = [
  '47a45a88-c031-700c-6e98-f80e2b45eb07',
  '12345678-1234-1234-1234-123456789012',
  '23456789-2345-2345-2345-234567890123',
  '34567890-3456-3456-3456-345678901234',
  '45678901-4567-4567-4567-456789012345',
  '56789012-5678-5678-5678-567890123456',
  '67890123-6789-6789-6789-678901234567',
  '78901234-7890-7890-7890-789012345678',
  '89012345-8901-8901-8901-890123456789',
  '90123456-9012-9012-9012-901234567890',
];

// --- ヘルパー関数 ---

/**
 * ランダムな整数を生成
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * ランダムな数量を生成（0.5刻み）
 */
function randomQuantity(min: number, max: number): number {
  const steps = Math.floor((max - min) * 2);
  return min + (randomInt(0, steps) * 0.5);
}

/**
 * ランダムな日付を生成
 */
function randomDate(year: number, month: number): Date {
  const day = randomInt(1, 28); // 安全のため28日までに制限
  const hour = randomInt(0, 23);
  const minute = randomInt(0, 59);
  const second = randomInt(0, 59);
  return new Date(year, month - 1, day, hour, minute, second);
}

/**
 * 配列からランダムに選択
 */
function randomChoice<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

/**
 * 生鮮かどうかの判定と出荷月の取得
 */
function getValidPackageTypeAndMonth(variety: Variety, month: number): PackageType | null {
  const freshMonths = FRESH_SHIPPING_MONTHS[variety];
  
  if (freshMonths.includes(month)) {
    // 生鮮出荷可能月：FRESHまたはFROZENを選択
    return randomChoice(PACKAGE_TYPES);
  } else if (month >= Math.min(...freshMonths)) {
    // 生鮮出荷月以降：FROZENのみ
    return 'FROZEN';
  }
  
  return null; // この月は出荷不可
}

/**
 * FIWAREにデータを1件送信
 */
async function sendOneToFiware(entityType: string, data: any, index: number, total: number): Promise<void> {
  const headers = {
    'Content-Type': 'application/ld+json',
    'NGSILD-Tenant': FIWARE_SERVICE,
    'Accept': 'application/ld+json',
  };

  try {
    const url = `${FIWARE_ORION_URL}/entityOperations/upsert`;
    await axios.post(url, [data], { headers });
    console.log(`✓ ${entityType} [${index}/${total}]: ${data.id}`);
  } catch (error: any) {
    console.error(`✗ ${entityType} [${index}/${total}] 送信エラー:`, error.response?.data || error.message);
  }
}

/**
 * FIWAREに複数データを1件ずつ送信
 */
async function sendAllToFiware(entityType: string, dataList: any[]): Promise<void> {
  console.log(`📤 ${entityType}: ${dataList.length}件を送信中...`);
  
  for (let i = 0; i < dataList.length; i++) {
    await sendOneToFiware(entityType, dataList[i], i + 1, dataList.length);
    // 送信間隔を空ける
    await new Promise(resolve => setTimeout(resolve, SEND_INTERVAL_MS));
  }
  
  console.log(`✅ ${entityType}: 全${dataList.length}件の送信完了\n`);
}

/**
 * 生産計画データを生成
 * 生産者毎に種別4種、荷姿2種の8パターンのデータを生成
 */
function generateProductionPlans(): ProductionPlan[] {
  const plans: ProductionPlan[] = [];
  let planId = 1;

  // 1月から4月までの期間に生産計画を登録
  for (let month = 1; month <= 4; month++) {
    // 各生産者について
    for (const producerId of PRODUCER_IDS) {
      // 各種別について
      for (const variety of VARIETIES) {
        // 各荷姿について
        for (const packageType of PACKAGE_TYPES) {
          const shippingMonth = randomInt(6, 12); // 6月から12月の出荷
          
          // この種別・荷姿・月の組み合わせが有効かチェック
          const validPackageType = getValidPackageTypeAndMonth(variety, shippingMonth);
          if (!validPackageType || (packageType === 'FRESH' && validPackageType === 'FROZEN')) {
            // 生鮮不可の月に生鮮を指定した場合はスキップ
            continue;
          }

          const shippingWeek = randomInt(1, 5);
          const createdAt = randomDate(2025, month);
          
          plans.push({
            id: String(planId),
            planNumber: planId,
            producerId,
            shippingMonth,
            shippingWeek,
            packageType,
            variety,
            quantity: randomQuantity(5, 50),
            pricePerKg: PRICES[variety],
            isPublished: Math.random() > 0.3, // 70%の確率で公開
            createdAt: createdAt.toISOString(),
            updatedAt: createdAt.toISOString(),
          });
          
          planId++;
        }
      }
    }
  }

  return plans;
}

/**
 * 出荷予定データを生成（在庫情報に基づく）
 * 出荷予定数は在庫登録数を超えない
 */
function generateShippingSchedules(inventories: Inventory[]): ShippingSchedule[] {
  const schedules: ShippingSchedule[] = [];
  let scheduleId = 1;

  // 在庫情報から出荷予定を生成
  // 各在庫に対して、その1ヶ月前くらいに出荷予定を登録
  for (const inventory of inventories) {
    // 在庫が登録された月を推定（createdAtから）
    const inventoryDate = new Date(inventory.createdAt);
    const inventoryMonth = inventoryDate.getMonth() + 1; // 1-12
    
    // 出荷予定は在庫登録の1ヶ月前（ただし5月以降）
    const scheduleMonth = Math.max(5, inventoryMonth - 1);
    
    if (scheduleMonth >= inventoryMonth) continue; // 在庫登録より後には出荷予定を登録しない
    
    const shippingWeek = randomInt(1, 5);
    const createdAt = randomDate(2025, scheduleMonth);
    
    // 出荷予定数は在庫数と同じかそれ以下
    const quantity = randomQuantity(
      Math.min(5, inventory.quantity),
      inventory.quantity
    );
    
    schedules.push({
      id: String(scheduleId),
      scheduleNumber: scheduleId,
      producerId: inventory.producerId,
      shippingMonth: inventoryMonth,
      shippingWeek,
      packageType: inventory.packageType,
      variety: inventory.variety,
      quantity,
      pricePerKg: PRICES[inventory.variety],
      isPublished: Math.random() > 0.2, // 80%の確率で公開
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    });
    
    scheduleId++;
  }

  return schedules;
}

/**
 * 在庫情報データを生成
 */
function generateInventories(): Inventory[] {
  const inventories: Inventory[] = [];
  let inventoryId = 1;

  // 6月から12月までの期間に在庫登録（最大64件）
  for (let month = 6; month <= 12; month++) {
    const inventoriesThisMonth = randomInt(6, 12); // 月あたり6-12件

    for (let i = 0; i < inventoriesThisMonth && inventoryId <= 64; i++) {
      const producerId = randomChoice(PRODUCER_IDS);
      const variety = randomChoice(VARIETIES);
      const packageType = getValidPackageTypeAndMonth(variety, month);
      
      if (!packageType) continue;

      const createdAt = randomDate(2025, month);
      
      inventories.push({
        id: String(inventoryId),
        producerId,
        packageType,
        variety,
        quantity: randomQuantity(5, 50), // 一度に50kg以下
        pricePerKg: PRICES[variety],
        isPublished: Math.random() > 0.25, // 75%の確率で公開
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
      });
      
      inventoryId++;
    }
  }

  return inventories;
}

/**
 * 発注依頼データを生成（在庫情報に基づく）
 */
function generateOrders(inventories: Inventory[]): Order[] {
  const orders: Order[] = [];
  let orderId = 1;

  // 在庫がある商品に対して発注を生成（最大30件）
  const availableInventories = inventories.filter(inv => inv.isPublished);
  const orderCount = Math.min(30, randomInt(20, 30));

  for (let i = 0; i < orderCount; i++) {
    const inventory = randomChoice(availableInventories);
    const customerId = randomChoice(CUSTOMER_IDS);
    
    // 在庫数量を超えない数量で発注
    const quantity = randomQuantity(1, Math.min(inventory.quantity, 20));
    const totalAmount = quantity * inventory.pricePerKg;
    
    const orderDate = new Date(inventory.createdAt);
    orderDate.setDate(orderDate.getDate() + randomInt(1, 30)); // 在庫登録後1-30日後
    
    // 希望納期は発注日の5-14日後
    const desiredDeliveryDate = new Date(orderDate);
    desiredDeliveryDate.setDate(desiredDeliveryDate.getDate() + randomInt(5, 14));
    
    orders.push({
      id: String(orderId),
      __typename: 'Order',
      createdAt: orderDate.toISOString(),
      updatedAt: orderDate.toISOString(),
      customerId,
      packageType: inventory.packageType,
      variety: inventory.variety,
      quantity,
      pricePerKg: inventory.pricePerKg,
      totalAmount,
      desiredDeliveryDate: desiredDeliveryDate.toISOString().split('T')[0],
      status: 'PENDING_SHIPPING_INSTRUCTION',
      orderNumber: orderId,
    });
    
    orderId++;
  }

  return orders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * データをNGSI-LD形式に変換
 */
function convertToNGSILD(entityType: string, entityIdPrefix: string, data: any[]): any[] {
  return data.map((item, index) => {
    const entityId = `urn:ngsi-ld:${entityType}:001`;
    const timestamp = item.createdAt || new Date().toISOString();
    
    return {
      id: entityId,
      type: entityType,
      systemTimestamp: {
        type: 'Property',
        value: timestamp,
      },
      data: {
        type: 'Property',
        value: item,
      },
      '@context': ['https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld'],
    };
  });
}

/**
 * メイン処理
 */
async function main() {
  console.log('========================================');
  console.log('キイチゴ受発注システム ダミーデータ生成');
  console.log('========================================\n');

  console.log('📊 データ生成中...\n');

  // 1. 生産計画データを生成
  console.log('1️⃣ 生産計画データを生成中...');
  const productionPlans = generateProductionPlans();
  console.log(`   生成数: ${productionPlans.length}件\n`);

  // 2. 在庫情報データを生成（出荷予定より先に生成）
  console.log('2️⃣ 在庫情報データを生成中...');
  const inventories = generateInventories();
  console.log(`   生成数: ${inventories.length}件\n`);

  // 3. 出荷予定データを生成（在庫情報に基づく）
  console.log('3️⃣ 出荷予定データを生成中...');
  const shippingSchedules = generateShippingSchedules(inventories);
  console.log(`   生成数: ${shippingSchedules.length}件\n`);

  // 4. 発注依頼データを生成（在庫情報に基づく）
  console.log('4️⃣ 発注依頼データを生成中...');
  const orders = generateOrders(inventories);
  console.log(`   生成数: ${orders.length}件\n`);

  console.log('========================================');
  console.log('📤 FIWAREへデータ送信中...\n');

  // NGSI-LD形式に変換
  const productionPlanEntities = convertToNGSILD('FreshOrderSystemProductionPlan', 'ProductionPlan', productionPlans);
  const shippingScheduleEntities = convertToNGSILD('FreshOrderSystemShippingSchedule', 'ShippingSchedule', shippingSchedules);
  const inventoryEntities = convertToNGSILD('FreshOrderSystemInventory', 'Inventory', inventories);
  const orderEntities = convertToNGSILD('FreshOrderSystemOrder', 'Order', orders);

  // FIWAREに1件ずつ送信（生成順序と同じ）
  await sendAllToFiware('生産計画', productionPlanEntities);
  await sendAllToFiware('在庫情報', inventoryEntities);
  await sendAllToFiware('出荷予定', shippingScheduleEntities);
  await sendAllToFiware('発注依頼', orderEntities);

  console.log('========================================');
  console.log('✅ 全てのデータ送信が完了しました');
  console.log('========================================');
}

// プログラム実行
main().catch(error => {
  console.error('❌ エラーが発生しました:', error);
  process.exit(1);
});
