# Navegador Seguro para Exámenes

## Descripción General
Este proyecto es una aplicación de escritorio basada en **Electron.js** diseñada para funcionar como un "Safe Exam Browser" (Navegador Seguro). Su objetivo principal es encapsular una plataforma de exámenes web dentro de un entorno controlado, con el fin de prevenir que los estudiantes hagan trampa bloqueando interacciones comunes del sistema operativo.

## Características de Seguridad Implementadas
1. **Modo Quiosco (Kiosk Mode):** La aplicación ocupa toda la pantalla de manera inamovible, ocultando la barra de tareas y el entorno de escritorio normal.
2. **Restricción de Interfaz:** Está deshabilitado globalmente el clic derecho, así como las funciones de teclado para copiar, cortar y pegar, con el fin de evitar fuga o ingreso de información ajena.
3. **Bloqueo de Herramientas de Desarrollador:** Atajos como `F12` o `Ctrl+Shift+I` están bloqueados para evitar inspección y modificación de la página de examen.
4. **Mecanismo de Salida Seguro:** El programa bloquea los intentos de cierre convencional (como `Alt+F4` o `Cmd+Q`). En su lugar, intercepta el intento de cierre y exige introducir una contraseña. La contraseña por defecto del profesor es `1234`.

---

## Estructura del Proyecto

El sistema está dividido en varios archivos que trabajan en conjunto para proporcionar el entorno seguro:

* **`package.json`**: 
  Archivo principal de configuración de Node.js. Define los metadatos del proyecto, el script de ejecución (`"start": "electron ."`) y especifica a `electron` como dependencia del entorno de desarrollo.
  
* **`main.js`**: 
  El proceso principal (Main Process) de la aplicación. Aquí es donde la "magia" sucede a nivel del sistema operativo. Se encarga de instanciar la ventana de Electron a pantalla completa, establecer las restricciones de atajos, bloquear el cierre sin autorización y validar la contraseña de salida ingresada (IPC Handler).

* **`preload.js`**: 
  Un script que se ejecuta antes de cargar la página web. Funciona como un puente de comunicación seguro (Context Bridge) entre la interfaz gráfica (`index.html`) y el proceso principal (`main.js`). Solo expone comandos explícitos como `verifyExit` y `onShowExitDialog`, protegiendo la computadora del estudiante de ejecutar código Node.js arbitrario desde la web.

* **`index.html`**: 
  Es la interfaz que envuelve todo el sistema. Consta de tres partes:
  1. Una pantalla de inicio ("Comenzar Examen").
  2. Un elemento `<iframe id="browser-view">` donde se carga dinámicamente el URL del examen real.
  3. Una capa negra semi-transparente (Modal/Overlay) que contiene el formulario de la contraseña de salida, la cual siempre se mantiene por encima del examen.

* **`exam.html`**: 
  (Archivo de Demostración) Es un cuestionario local de prueba creado para simular el comportamiento de una plataforma de evaluación real. Cuando el estudiante llega al final y hace clic en "Finalizar y Salir", este archivo envía una señal a su ventana "padre" (`index.html`) para que despliegue la ventana de introducción de contraseña.

---

## Cómo Instalar y Ejecutar

### Requisitos Previos
- Node.js instalado en el sistema.

### Instalación Inicial
Abre una terminal, sitúate en la carpeta del proyecto y descarga las dependencias necesarias de Electron:
```bash
cd /ruta/a/la/carpeta/del/proyecto
npm install
```

### Ejecutar el Navegador Seguro
Una vez que las dependencias están instaladas, basta con ejecutar:
```bash
npm start
```
La aplicación se abrirá, bloqueando la pantalla y permitiéndote entrar al examen de prueba.

### Cerrar la Aplicación
Para cerrar el programa:
1. Haz clic en "Finalizar y Salir" al final del `exam.html`, o bien intenta cerrar la ventana (con `Alt+F4`, botón de cerrar de tu gestor de ventanas, etc).
2. Aparecerá el diálogo pidiendo la contraseña.
3. Introduce la contraseña por defecto: **`1234`**
4. Haz clic en el botón "Salir".
