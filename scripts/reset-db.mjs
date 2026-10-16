// Borra la base local y los archivos subidos. Al iniciar la app se recrean el esquema y los datos demo.
// Detén el servidor (`npm run dev`) antes de ejecutarlo.
import fs from 'node:fs'
import path from 'node:path'

const dir = process.env.HANDYMAN_DATA_DIR || path.join(process.cwd(), '.data')
for (const sub of ['pg', 'storage']) fs.rmSync(path.join(dir, sub), { recursive: true, force: true })
console.log(`Datos de demostración reiniciados en ${dir}. Inicia la app para volver a sembrarlos.`)
