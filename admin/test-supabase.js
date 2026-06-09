const url = 'https://zuondbguopirimvfuehu.supabase.co/rest/v1/products?select=*';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1b25kYmd1b3BpcmltdmZ1ZWh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAzMjk2NiwiZXhwIjoyMDg3NjA4OTY2fQ.9Zja0di6OMtWwFyigiZiWnXo0burILHTVAuBOf6EhUE';

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
