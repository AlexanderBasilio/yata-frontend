const fs = require('fs');
const filePath = 'src/environments/environment.prod.ts';
const token = 'pk.eyJ1IjoieWF0YS10ZWNoLXNlcnZpY2VzIiwiYSI6ImNtcHlwaHNlNzA5bDUycW9qYmZ0OHc5ZGEifQ.RMWQY1E-kY9pwrMb-L4yiw';

let content = fs.readFileSync(filePath, 'utf8');
content = content.replace('TOKEN_MAPBOX_PRODUCCION', token);
fs.writeFileSync(filePath, content, 'utf8');