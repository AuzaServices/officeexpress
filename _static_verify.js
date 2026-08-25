const e = require('express');
const a = e();
a.use(e.static('public'));
a.listen(4999, () => console.log('listening 4999'));
