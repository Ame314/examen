# Implementación del Patrón MVC

El código fuente actual de la aplicación aplica estrictamente el patrón **Modelo-Vista-Controlador (MVC)**, garantizando que la lógica de negocios, la manipulación de datos y la interfaz gráfica estén desacopladas. Esto facilita el mantenimiento, las pruebas y la escalabilidad (como la reciente adaptación a entorno Web).

## 1. El Modelo (`/models`)

La capa del modelo es responsable de interactuar directamente con la base de datos, en este caso, **Firebase Firestore**.

**Archivo clave:** `models/Database.js`
- **Responsabilidad:** Abstraer las reglas de Firestore (CRUD). Las vistas y controladores nunca ejecutan queries SQL o de Firebase directamente.
- **Implementación:**
  ```javascript
  class Database {
      async saveStudent(student) {
          // Lógica pura de base de datos
          await addDoc(collection(this.db, 'students'), student);
      }
  }
  ```

## 2. El Controlador (`/controllers`)

La capa del controlador actúa como el "cerebro" intermediario. Escucha peticiones de las Vistas (a través del puente IPC en Electron), aplica las reglas de negocio y ordena al Modelo que guarde o recupere datos.

**Archivos clave:** `controllers/ExamController.js`, `controllers/AuthController.js`
- **Responsabilidad:** Validar datos, ejecutar procesos (como calcular calificaciones si fuera necesario en el backend) y manejar la seguridad lógica.
- **Implementación:**
  ```javascript
  class ExamController {
      async gradeExam(studentName, answers, essay) {
          // Reglas de negocio antes de tocar la base de datos
          let score = 0; 
          // (Cálculo de puntaje)
          await this.db.saveStudent({ name: studentName, score, essay });
      }
  }
  ```

## 3. La Vista (`/vistas HTML`)

La capa de la vista es estrictamente para la presentación visual (UI/UX) y la recopilación de interacción del usuario. No contiene credenciales de base de datos ocultas ni lógica de negocio profunda.

**Archivos clave:** `index.html`, `exam.html`, `admin.html`
- **Responsabilidad:** Mostrar los datos procesados al usuario e invocar a los Controladores (mediante `window.electronAPI`) ante los eventos del usuario (clics, submit).
- **Implementación (Modo Seguro):**
  ```html
  <!-- exam.html -->
  <button onclick="finishExam()">Finalizar</button>
  <script>
      async function finishExam() {
          const studentData = { name: "Amelie", score: 10 };
          // Pide al controlador que maneje el guardado, la vista no sabe CÓMO se guarda.
          await window.parent.electronAPI.saveStudent(studentData); 
      }
  </script>
  ```

## 4. Puente de Comunicación (`main.js` y `preload.js`)
En la arquitectura Electron, los controladores y modelos viven en el **Proceso Principal** (Backend/Node.js), mientras que las vistas viven en el **Proceso de Renderizado** (Frontend/Chromium). 

El `preload.js` asegura el patrón MVC restringiendo qué controladores puede invocar la vista, aislando así el contexto de ejecución por máxima seguridad académica.
