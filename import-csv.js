const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Строка подключения (возьмите из переменной окружения или укажите явно)
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_uX6MnvH5OCBR@ep-small-mouse-amsy1py5-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const csvFilePath = path.join(__dirname, 'price_import_ready.csv');

async function importCSV() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('✅ Подключено к БД');

  const content = fs.readFileSync(csvFilePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const headers = lines[0].split(','); // name,specification,stock,...

  let inserted = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(',').map((v) => v.replace(/^"|"$/g, '').trim());
    if (values.length < 7) continue;

    const name = values[0];
    const specification = values[1];
    const stock = parseInt(values[2], 10);
    const price_tier_1 = parseFloat(values[3]);
    const price_tier_2 = parseFloat(values[4]);
    const price_tier_3 = parseFloat(values[5]);
    const distributor_price = parseFloat(values[6]);

    // Пропускаем некорректные строки
    if (!name || isNaN(stock)) continue;

    try {
      await client.query(
        `INSERT INTO price_import 
          (name, specification, stock, price_tier_1, price_tier_2, price_tier_3, distributor_price, is_activated)
         VALUES ($1, $2, $3, $4, $5, $6, $7, false)`,
        [name, specification, stock, price_tier_1, price_tier_2, price_tier_3, distributor_price]
      );
      inserted++;
      if (inserted % 100 === 0) console.log(`Импортировано ${inserted} строк`);
    } catch (err) {
      console.error(`Ошибка в строке ${i}: ${err.message}`);
    }
  }

  console.log(`✅ Готово! Вставлено ${inserted} товаров.`);
  await client.end();
}

importCSV().catch(console.error);
