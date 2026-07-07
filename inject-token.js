const fs = require('fs');
const { spawnSync } = require('child_process');

const filePath = 'src/environments/environment.prod.ts';
const token = 'pk.eyJ1IjoieWF0YS10ZWNoLXNlcnZpY2VzIiwiYSI6ImNtcHlwaHNlNzA5bDUycW9qYmZ0OHc5ZGEifQ.RMWQY1E-kY9pwrMb-L4yiw';
const placeholder = 'TOKEN_MAPBOX_PRODUCCION';

// 1. Leer el contenido del archivo de producción
let originalContent = fs.readFileSync(filePath, 'utf8');

// Si el archivo ya tiene el token inyectado, lo normalizamos al placeholder para la restauración
if (originalContent.includes(token)) {
    originalContent = originalContent.replace(token, placeholder);
}

try {
    console.log('Inyectando Token de Mapbox temporalmente...');
    const injectedContent = originalContent.replace(placeholder, token);
    fs.writeFileSync(filePath, injectedContent, 'utf8');

    console.log('Iniciando compilación de producción con Angular...');
    const isWindows = process.platform === 'win32';
    const npxCmd = isWindows ? 'npx.cmd' : 'npx';
    
    // Ejecuta la compilación de producción de Angular de forma síncrona
    const buildResult = spawnSync(npxCmd, ['ng', 'build', '--configuration', 'production'], { 
        stdio: 'inherit', 
        shell: true 
    });

    if (buildResult.error) {
        console.error('El proceso de compilación falló al iniciar:', buildResult.error);
        process.exitCode = 1;
    } else if (buildResult.status !== 0) {
        console.error('La compilación de Angular falló con código de salida:', buildResult.status);
        process.exitCode = buildResult.status;
    } else {
        console.log('Compilación de producción completada con éxito.');
    }
} catch (err) {
    console.error('Error durante la inyección o compilación:', err);
    process.exitCode = 1;
} finally {
    console.log('Restaurando placeholder "TOKEN_MAPBOX_PRODUCCION" en environment.prod.ts para proteger Git...');
    fs.writeFileSync(filePath, originalContent, 'utf8');
}