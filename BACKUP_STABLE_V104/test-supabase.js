const url = 'https://zuondbguopirimvfuehu.supabase.co/rest/v1/products?select=*';
const key = 'sb_publishable_29SdlPI3zzDkNvvEO38kOQ_2NTwiTC_'; // Anonymized/public key from supabase.js

fetch(url, {
    headers: {
        'apikey': key,
        'Authorization': \`Bearer \${key}\`
    }
})
.then(res => res.json())
.then(data => {
    if (data.error) {
        console.error(data.error);
    } else {
        // Find products with 0 stock
        const zeroStock = data.filter(p => p.stockMillenio === 0 && p.stockVulcano === 0);
        console.log(\`Total products: \${data.length}\`);
        console.log(\`Zero stock products: \${zeroStock.length}\`);
        console.log(JSON.stringify(zeroStock, null, 2));
    }
})
.catch(console.error);
