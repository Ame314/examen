import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

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

export async function getDBWeb() {
    try {
        const data = { questions: [], students: [], logs: [] };
        
        const qSnapshot = await getDocs(collection(db, 'questions'));
        qSnapshot.forEach(doc => data.questions.push({ id: doc.id, ...doc.data() }));

        const sSnapshot = await getDocs(collection(db, 'students'));
        sSnapshot.forEach(doc => data.students.push({ id: doc.id, ...doc.data() }));

        const lSnapshot = await getDocs(collection(db, 'logs'));
        lSnapshot.forEach(doc => data.logs.push({ id: doc.id, ...doc.data() }));

        data.logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return data;
    } catch(e) {
        console.error("Error fetching data from Firebase Web", e);
        return { questions: [], students: [], logs: [] };
    }
}

export async function saveStudentWeb(studentData) {
    try {
        await addDoc(collection(db, 'students'), studentData);
    } catch(e) {
        console.error("Error saving student Web", e);
    }
}

export async function addQuestionWeb(question) {
    try {
        await addDoc(collection(db, 'questions'), question);
    } catch(e) {
        console.error("Error adding question Web", e);
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
