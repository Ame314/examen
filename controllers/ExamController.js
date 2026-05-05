class ExamController {
    constructor(db) {
        this.db = db;
    }

    async getAllData() {
        return await this.db.readDB();
    }

    async addQuestion(question) {
        return await this.db.addQuestion(question);
    }

    async gradeExam(studentName, answers, essay) {
        const data = await this.db.readDB();
        let score = 0;
        
        if (data.questions) {
            data.questions.forEach(q => {
                if (answers[`q${q.id}`] === q.correct) {
                    score += q.points;
                }
            });
        }
        
        const student = {
            name: studentName,
            score: score,
            essay: essay,
            completedAt: new Date().toISOString()
        };
        
        await this.db.saveStudent(student);
        return score;
    }
}

module.exports = ExamController;