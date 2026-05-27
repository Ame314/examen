import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDggCkAu3Fzj7i8nJl7AKxNWi-dd4pb2ww",
  authDomain: "examen-b08ed.firebaseapp.com",
  projectId: "examen-b08ed",
  storageBucket: "examen-b08ed.firebasestorage.app",
  messagingSenderId: "992225354514",
  appId: "1:992225354514:web:a32c35dbe47ecc3d3589cb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Ejecutar verificación y seeding inicial en modo web
verifyAndSeedWeb().catch(e => console.error("Error executing web verify and seed", e));

export async function getDBWeb() {
    try {
        const data = { questions: [], students: [], logs: [], exams: [], users: [] };
        
        const qSnapshot = await getDocs(collection(db, 'questions'));
        qSnapshot.forEach(doc => data.questions.push({ id: doc.id, ...doc.data() }));

        const sSnapshot = await getDocs(collection(db, 'students'));
        sSnapshot.forEach(doc => data.students.push({ id: doc.id, ...doc.data() }));

        const lSnapshot = await getDocs(collection(db, 'logs'));
        lSnapshot.forEach(doc => data.logs.push({ id: doc.id, ...doc.data() }));

        const eSnapshot = await getDocs(collection(db, 'exams'));
        eSnapshot.forEach(doc => data.exams.push({ id: doc.id, ...doc.data() }));

        const uSnapshot = await getDocs(collection(db, 'users'));
        uSnapshot.forEach(doc => data.users.push({ id: doc.id, ...doc.data() }));

        data.logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return data;
    } catch(e) {
        console.error("Error fetching data from Firebase Web", e);
        return { questions: [], students: [], logs: [], exams: [], users: [] };
    }
}

async function verifyAndSeedWeb() {
    try {
        const data = await getDBWeb();
        
        // 1. Seed de usuarios
        if (data.users.length === 0) {
            console.log("Web Seeding: default users...");
            await addDoc(collection(db, 'users'), {
                username: 'admin',
                password: 'admin',
                name: 'Administrador Docente',
                role: 'teacher'
            });
            await addDoc(collection(db, 'users'), {
                username: 'estudiante',
                password: '1234',
                name: 'Estudiante de Prueba',
                role: 'student'
            });
        }

        // 2. Seed de exámenes
        let defaultExamId = 'default-exam';
        if (data.exams.length === 0) {
            console.log("Web Seeding: default exam...");
            const docRef = await addDoc(collection(db, 'exams'), {
                title: 'Examen de Historia Básica',
                description: 'Preguntas sobre la historia universal básica y hechos históricos importantes.',
                password: '1234',
                createdAt: new Date().toISOString()
            });
            defaultExamId = docRef.id;
        } else {
            defaultExamId = data.exams[0].id;
        }

        // 3. Vincular preguntas huérfanas
        for (const q of data.questions) {
            if (!q.examId) {
                console.log(`Web Migrating: orphaned question ${q.id} to exam ${defaultExamId}...`);
                const qRef = doc(db, 'questions', q.id);
                await updateDoc(qRef, { examId: defaultExamId });
            }
        }

        // 4. Seed de preguntas básicas si está vacío
        if (data.questions.length === 0) {
            console.log("Web Seeding: default questions...");
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
                await addDoc(collection(db, 'questions'), q);
            }
        }
    } catch(e) {
        console.error("Error during web verify and seed", e);
    }
}

export async function verifyLoginWeb(username, password) {
    try {
        if (username === 'admin' && password === 'admin') {
            return { username: 'admin', name: 'Administrador Docente', role: 'teacher' };
        }
        if (username === 'estudiante' && password === '1234') {
            return { username: 'estudiante', name: 'Estudiante de Prueba', role: 'student' };
        }

        const data = await getDBWeb();
        const user = data.users.find(u => u.username === username && u.password === password);
        return user || null;
    } catch(e) {
        console.error("Error verifying login Web", e);
        return null;
    }
}

export async function saveUserWeb(user) {
    try {
        await addDoc(collection(db, 'users'), user);
        return true;
    } catch(e) {
        console.error("Error saving user Web", e);
        return false;
    }
}

export async function deleteUserWeb(userId) {
    try {
        const userRef = doc(db, 'users', userId);
        await deleteDoc(userRef);
        return true;
    } catch(e) {
        console.error("Error deleting user Web", e);
        return false;
    }
}

export async function saveExamWeb(exam) {
    try {
        await addDoc(collection(db, 'exams'), exam);
        return true;
    } catch(e) {
        console.error("Error saving exam Web", e);
        return false;
    }
}

export async function updateExamWeb(examId, updatedData) {
    try {
        const examRef = doc(db, 'exams', examId);
        await updateDoc(examRef, updatedData);
        return true;
    } catch(e) {
        console.error("Error updating exam Web", e);
        return false;
    }
}

export async function deleteExamWeb(examId) {
    try {
        const examRef = doc(db, 'exams', examId);
        await deleteDoc(examRef);
        
        // Eliminar cascada de preguntas
        const data = await getDBWeb();
        const questionsToDelete = data.questions.filter(q => q.examId === examId);
        for (const q of questionsToDelete) {
            const qRef = doc(db, 'questions', q.id);
            await deleteDoc(qRef);
        }
        return true;
    } catch(e) {
        console.error("Error deleting exam Web", e);
        return false;
    }
}

export async function saveStudentWeb(studentData) {
    try {
        await addDoc(collection(db, 'students'), studentData);
    } catch(e) {
        console.error("Error saving student Web", e);
    }
}

export async function updateStudentWeb(studentId, updatedData) {
    try {
        const studentRef = doc(db, 'students', studentId);
        await updateDoc(studentRef, updatedData);
    } catch(e) {
        console.error("Error updating student Web", e);
    }
}

export async function addQuestionWeb(question) {
    try {
        await addDoc(collection(db, 'questions'), question);
    } catch(e) {
        console.error("Error adding question Web", e);
    }
}

export async function updateQuestionWeb(questionId, updatedData) {
    try {
        const questionRef = doc(db, 'questions', questionId);
        await updateDoc(questionRef, updatedData);
    } catch(e) {
        console.error("Error updating question Web", e);
    }
}

export async function deleteQuestionWeb(questionId) {
    try {
        const questionRef = doc(db, 'questions', questionId);
        await deleteDoc(questionRef);
    } catch(e) {
        console.error("Error deleting question Web", e);
    }
}

export async function addLogWeb(eventType, detail) {
    try {
        await addDoc(collection(db, 'logs'), {
            tipoEvento: eventType,
            detail: detail,
            timestamp: new Date().toISOString()
        });
    } catch(e) {
        console.error("Error saving log Web", e);
    }
}
