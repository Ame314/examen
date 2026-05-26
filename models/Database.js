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
    }

    async readDB() {
        try {
            const data = { questions: [], students: [], logs: [] };
            
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

            data.logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            return data;
        } catch(e) {
            console.error("Error reading from Firebase", e);
            return { questions: [], students: [], logs: [] };
        }
    }

    async writeDB(data) {
        // Obsoleto en Firestore, los cambios se hacen directos
    }

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