const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, addDoc, doc, updateDoc, deleteDoc } = require('firebase/firestore');

class Database {
    constructor() {
        const firebaseConfig = {
            apiKey: process.env.FIREBASE_API_KEY,
            authDomain: process.env.FIREBASE_AUTH_DOMAIN,
            projectId: process.env.FIREBASE_PROJECT_ID,
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.FIREBASE_APP_ID
        };
        const app = initializeApp(firebaseConfig);
        this.db = getFirestore(app);
        
        // Ejecutar verificación y seeding inicial en segundo plano
        this.verifyAndSeed().catch(e => console.error("Error running verify and seed", e));
    }

    async readDB() {
        try {
            const data = { questions: [], students: [], logs: [], exams: [], users: [] };
            
            const qSnapshot = await getDocs(collection(this.db, 'questions'));
            qSnapshot.forEach(doc => {
                data.questions.push({ id: doc.id, ...doc.data() });
            });

            const sSnapshot = await getDocs(collection(this.db, 'students'));
            sSnapshot.forEach(doc => {
                data.students.push({ id: doc.id, ...doc.data() });
            });

            const lSnapshot = await getDocs(collection(this.db, 'logs'));
            lSnapshot.forEach(doc => {
                data.logs.push({ id: doc.id, ...doc.data() });
            });

            const eSnapshot = await getDocs(collection(this.db, 'exams'));
            eSnapshot.forEach(doc => {
                data.exams.push({ id: doc.id, ...doc.data() });
            });

            const uSnapshot = await getDocs(collection(this.db, 'users'));
            uSnapshot.forEach(doc => {
                data.users.push({ id: doc.id, ...doc.data() });
            });

            data.logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            return data;
        } catch(e) {
            console.error("Error reading from Firebase", e);
            return { questions: [], students: [], logs: [], exams: [], users: [] };
        }
    }

    async verifyAndSeed() {
        try {
            const data = await this.readDB();
            
            // 1. Seed de Usuarios (si no hay ninguno)
            if (data.users.length === 0) {
                console.log("Seeding default users...");
                const defaultTeacher = {
                    username: 'admin',
                    password: 'admin',
                    name: 'Administrador Docente',
                    role: 'teacher'
                };
                const defaultStudent = {
                    username: 'estudiante',
                    password: '1234',
                    name: 'Estudiante de Prueba',
                    role: 'student'
                };
                await addDoc(collection(this.db, 'users'), defaultTeacher);
                await addDoc(collection(this.db, 'users'), defaultStudent);
            }

            // 2. Seed de Exámenes (si no hay ninguno)
            let defaultExamId = 'default-exam';
            if (data.exams.length === 0) {
                console.log("Seeding default exam...");
                const defaultExam = {
                    title: 'Examen de Historia Básica',
                    description: 'Preguntas sobre la historia universal básica y hechos históricos importantes.',
                    password: '1234',
                    createdAt: new Date().toISOString()
                };
                const docRef = await addDoc(collection(this.db, 'exams'), defaultExam);
                defaultExamId = docRef.id;
            } else {
                defaultExamId = data.exams[0].id;
            }

            // 3. Vincular preguntas huérfanas al examen por defecto
            let updatedAny = false;
            for (const q of data.questions) {
                if (!q.examId) {
                    console.log(`Migrating orphaned question ${q.id} to exam ${defaultExamId}...`);
                    const qRef = doc(this.db, 'questions', q.id);
                    await updateDoc(qRef, { examId: defaultExamId });
                    updatedAny = true;
                }
            }

            if (data.questions.length === 0) {
                console.log("Seeding default questions...");
                const defaultQuestions = [
                    {
                        examId: defaultExamId,
                        text: '¿En qué año comenzó la Segunda Guerra Mundial?',
                        options: { a: '1914', b: '1939', c: '1945' },
                        correct: 'b',
                        points: 5
                    },
                    {
                        examId: defaultExamId,
                        text: '¿Quién escribió la Odisea?',
                        options: { a: 'Homero', b: 'Cervantes', c: 'Shakespeare' },
                        correct: 'a',
                        points: 5
                    }
                ];
                for (const q of defaultQuestions) {
                    await addDoc(collection(this.db, 'questions'), q);
                }
            }
        } catch(e) {
            console.error("Error during verify and seed", e);
        }
    }

    // ─── Métodos CRUD de Usuarios ─────────────────────────────────
    async verifyLogin(username, password) {
        try {
            // Fallback directo por seguridad si falla la red o para pruebas rápidas
            if (username === 'admin' && password === 'admin') {
                return { username: 'admin', name: 'Administrador Docente', role: 'teacher' };
            }
            if (username === 'estudiante' && password === '1234') {
                return { username: 'estudiante', name: 'Estudiante de Prueba', role: 'student' };
            }

            const data = await this.readDB();
            const user = data.users.find(u => u.username === username && u.password === password);
            return user || null;
        } catch(e) {
            console.error("Error verifying login", e);
            return null;
        }
    }

    async saveUser(user) {
        try {
            await addDoc(collection(this.db, 'users'), user);
            return true;
        } catch(e) {
            console.error("Error saving user to Firebase", e);
            return false;
        }
    }

    async deleteUser(userId) {
        try {
            const userRef = doc(this.db, 'users', userId);
            await deleteDoc(userRef);
            return true;
        } catch(e) {
            console.error("Error deleting user from Firebase", e);
            return false;
        }
    }

    // ─── Métodos CRUD de Exámenes ────────────────────────────────
    async saveExam(exam) {
        try {
            await addDoc(collection(this.db, 'exams'), exam);
            return true;
        } catch(e) {
            console.error("Error saving exam to Firebase", e);
            return false;
        }
    }

    async updateExam(examId, updatedData) {
        try {
            const examRef = doc(this.db, 'exams', examId);
            await updateDoc(examRef, updatedData);
            return true;
        } catch(e) {
            console.error("Error updating exam in Firebase", e);
            return false;
        }
    }

    async deleteExam(examId) {
        try {
            // Eliminar examen
            const examRef = doc(this.db, 'exams', examId);
            await deleteDoc(examRef);
            
            // Eliminar cascada: preguntas de este examen
            const data = await this.readDB();
            const questionsToDelete = data.questions.filter(q => q.examId === examId);
            for (const q of questionsToDelete) {
                const qRef = doc(this.db, 'questions', q.id);
                await deleteDoc(qRef);
            }
            
            return true;
        } catch(e) {
            console.error("Error deleting exam from Firebase", e);
            return false;
        }
    }

    // ─── Métodos Heredados Actualizados o Conservados ────────────
    async saveStudent(student) {
        try {
            await addDoc(collection(this.db, 'students'), student);
        } catch(e) {
            console.error("Error saving student to Firebase", e);
        }
    }

    async updateStudent(studentId, updatedData) {
        try {
            const studentRef = doc(this.db, 'students', studentId);
            await updateDoc(studentRef, updatedData);
            return true;
        } catch(e) {
            console.error("Error updating student in Firebase", e);
            return false;
        }
    }

    async addLog(eventType, detail) {
        try {
            await addDoc(collection(this.db, 'logs'), {
                tipoEvento: eventType,
                detail: detail,
                timestamp: new Date().toISOString()
            });
            return true;
        } catch(e) {
            console.error("Error saving log to Firebase", e);
            return false;
        }
    }

    async addQuestion(question) {
        try {
            await addDoc(collection(this.db, 'questions'), question);
            return true;
        } catch(e) {
            console.error("Error saving question to Firebase", e);
            return false;
        }
    }

    async updateQuestion(questionId, updatedData) {
        try {
            const questionRef = doc(this.db, 'questions', questionId);
            await updateDoc(questionRef, updatedData);
            return true;
        } catch(e) {
            console.error("Error updating question in Firebase", e);
            return false;
        }
    }

    async deleteQuestion(questionId) {
        try {
            const questionRef = doc(this.db, 'questions', questionId);
            await deleteDoc(questionRef);
            return true;
        } catch(e) {
            console.error("Error deleting question from Firebase", e);
            return false;
        }
    }
}

module.exports = Database;