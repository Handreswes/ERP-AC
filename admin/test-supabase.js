const url = 'https://zuondbguopirimvfuehu.supabase.co/rest/v1/products?select=*';
const key = 'sb_publishable_29SdlPI3zzDkNvvEO38kOQ_2NTwiTC_';

fetch(url, {
    headers: {
        'apikey': key,
        'Authorization': 'Bearer ' + key
    }
})
.then(res => res.json())
.then(data => {
    if (data.error) {
        console.error(data.error);
    } else {
        console.log('Total products: ' + data.length);
        if (data.length > 0) {
            console.log('First product: ' + data[0].name);
        }
    }
})
.catch(console.error);
