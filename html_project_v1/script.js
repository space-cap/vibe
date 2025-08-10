class JavaInterviewQuiz {
    constructor() {
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.questions = [];
        this.selectedAnswers = [];
        this.quizStarted = false;
        this.allQuestions = {}; // JSON에서 로드할 데이터
        this.loadingCategories = new Set(); // 로딩 중인 카테고리 추적
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.startBtn = document.getElementById('startBtn');
        this.showAnswerBtn = document.getElementById('showAnswerBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.restartBtn = document.getElementById('restartBtn');
        this.questionTitle = document.getElementById('questionTitle');
        this.questionText = document.getElementById('questionText');
        this.answerSection = document.getElementById('answerSection');
        this.answerOptions = document.getElementById('answerOptions');
        this.answerExplanation = document.getElementById('answerExplanation');
        this.explanationText = document.getElementById('explanationText');
        this.scoreElement = document.getElementById('score');
        this.totalQuestionsElement = document.getElementById('totalQuestions');
        this.questionNumberElement = document.getElementById('questionNumber');
        this.totalCountElement = document.getElementById('totalCount');
        this.progressElement = document.getElementById('progress');
        this.quizResult = document.getElementById('quizResult');
        this.finalScore = document.getElementById('finalScore');
        this.finalTotalQuestions = document.getElementById('finalTotalQuestions');
        this.finalPercentage = document.getElementById('finalPercentage');
        this.resultGrade = document.getElementById('resultGrade');
        this.questionCard = document.getElementById('questionCard');
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startQuiz());
        this.showAnswerBtn.addEventListener('click', () => this.showAnswer());
        this.nextBtn.addEventListener('click', () => this.nextQuestion());
        this.restartBtn.addEventListener('click', () => this.restartQuiz());

        // 모바일 사이드바 토글
        const mobileToggle = document.getElementById('mobileToggle');
        const sidebarContent = document.getElementById('sidebarContent');

        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                sidebarContent.classList.toggle('open');
            });
        }

        if (sidebarContent) {
            sidebarContent.addEventListener('click', (e) => {
                if (e.target === sidebarContent || e.target.matches('.sidebar-content::before')) {
                    sidebarContent.classList.remove('open');
                }
            });
        }
    }

    // 카테고리별 JSON 파일 경로 정의
    getCategoryDataPath(category) {
        const categoryPaths = {
            basic: 'data/basic.json',
            oop: 'data/oop.json',
            collections: 'data/collections.json',
            exception: 'data/exception.json',
            thread: 'data/thread.json',
            jvm: 'data/jvm.json',
            spring: 'data/spring.json'
        };
        return categoryPaths[category];
    }

    // 개별 카테고리 JSON 파일 로드
    async loadCategoryQuestions(category) {
        if (this.allQuestions[category] || this.loadingCategories.has(category)) {
            return; // 이미 로드됨 또는 로딩 중
        }

        this.loadingCategories.add(category);

        try {
            const response = await fetch(this.getCategoryDataPath(category));
            if (!response.ok) {
                throw new Error(`Failed to load ${category} questions: ${response.statusText}`);
            }
            const questions = await response.json();
            this.allQuestions[category] = questions;
        } catch (error) {
            console.error(`Error loading ${category} questions:`, error);
            // 에러 발생 시 빈 배열로 초기화
            this.allQuestions[category] = [];
        } finally {
            this.loadingCategories.delete(category);
        }
    }

    // 선택된 카테고리들의 JSON 파일들을 로드
    async loadSelectedCategories(selectedCategories) {
        const loadPromises = selectedCategories.map(category =>
            this.loadCategoryQuestions(category)
        );

        try {
            await Promise.all(loadPromises);
        } catch (error) {
            console.error('Error loading question categories:', error);
        }
    }

    getSelectedQuestions() {
        const selectedCategories = Array.from(document.querySelectorAll('.category-options input:checked')).map(cb => cb.value);
        const selectedDifficulty = document.querySelector('.difficulty-options input:checked').value;

        let questions = [];
        selectedCategories.forEach(category => {
            if (this.allQuestions[category]) {
                questions = questions.concat(this.allQuestions[category]);
            }
        });

        if (selectedDifficulty !== 'mixed') {
            questions = questions.filter(q => q.difficulty === selectedDifficulty);
        }

        return this.shuffleArray(questions);
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    async startQuiz() {
        const selectedCategories = Array.from(document.querySelectorAll('.category-options input:checked')).map(cb => cb.value);

        if (selectedCategories.length === 0) {
            alert('최소 하나의 카테고리를 선택해주세요.');
            return;
        }

        // 로딩 상태 표시
        this.showLoadingState();

        try {
            // 선택된 카테고리들의 JSON 파일 로드
            await this.loadSelectedCategories(selectedCategories);

            // 문제 생성
            this.questions = this.getSelectedQuestions();
            if (this.questions.length === 0) {
                alert('선택된 카테고리와 난이도에 해당하는 문제가 없습니다.');
                this.hideLoadingState();
                return;
            }

            this.currentQuestionIndex = 0;
            this.score = 0;
            this.selectedAnswers = [];
            this.quizStarted = true;

            this.startBtn.style.display = 'none';
            this.quizResult.style.display = 'none';
            this.restartBtn.style.display = 'none';
            this.hideLoadingState();

            this.updateScore();
            this.showQuestion();
        } catch (error) {
            console.error('Error starting quiz:', error);
            alert('문제를 로드하는 중 오류가 발생했습니다. 다시 시도해주세요.');
            this.hideLoadingState();
        }
    }

    // 로딩 상태 표시
    showLoadingState() {
        this.startBtn.textContent = '문제 로딩 중...';
        this.startBtn.disabled = true;
    }

    // 로딩 상태 숨김
    hideLoadingState() {
        this.startBtn.textContent = '시작하기';
        this.startBtn.disabled = false;
    }

    showQuestion() {
        if (this.currentQuestionIndex >= this.questions.length) {
            this.showResults();
            return;
        }

        const question = this.questions[this.currentQuestionIndex];
        this.questionTitle.textContent = `문제 ${this.currentQuestionIndex + 1}: ${question.category} (${this.getDifficultyText(question.difficulty)})`;
        this.questionText.textContent = question.question;

        this.answerSection.style.display = 'block';
        this.answerOptions.innerHTML = '';
        this.answerExplanation.style.display = 'none';

        question.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'answer-option';
            button.textContent = `${index + 1}. ${option}`;
            button.addEventListener('click', () => this.selectAnswer(index));
            this.answerOptions.appendChild(button);
        });

        this.showAnswerBtn.style.display = 'inline-block';
        this.nextBtn.style.display = 'none';

        this.updateProgress();
    }

    selectAnswer(selectedIndex) {
        const buttons = this.answerOptions.querySelectorAll('.answer-option');
        buttons.forEach((button, index) => {
            button.classList.remove('selected');
            if (index === selectedIndex) {
                button.classList.add('selected');
            }
        });
        this.selectedAnswers[this.currentQuestionIndex] = selectedIndex;
    }

    showAnswer() {
        const question = this.questions[this.currentQuestionIndex];
        const selectedAnswer = this.selectedAnswers[this.currentQuestionIndex];
        const buttons = this.answerOptions.querySelectorAll('.answer-option');

        buttons.forEach((button, index) => {
            button.disabled = true;
            if (index === question.correct) {
                button.classList.add('correct');
            } else if (index === selectedAnswer && index !== question.correct) {
                button.classList.add('incorrect');
            }
        });

        if (selectedAnswer === question.correct) {
            this.score++;
        }

        this.explanationText.textContent = question.explanation;
        this.answerExplanation.style.display = 'block';
        this.showAnswerBtn.style.display = 'none';
        this.nextBtn.style.display = 'inline-block';

        this.updateScore();
    }

    nextQuestion() {
        this.currentQuestionIndex++;

        const buttons = this.answerOptions.querySelectorAll('.answer-option');
        buttons.forEach(button => {
            button.disabled = false;
            button.classList.remove('selected', 'correct', 'incorrect');
        });

        this.showQuestion();
    }

    updateScore() {
        this.scoreElement.textContent = this.score;
        this.totalQuestionsElement.textContent = this.questions.length;
        this.questionNumberElement.textContent = this.currentQuestionIndex + 1;
        this.totalCountElement.textContent = this.questions.length;
    }

    updateProgress() {
        const progress = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
        this.progressElement.style.width = `${progress}%`;
    }

    showResults() {
        this.questionCard.style.display = 'none';
        this.quizResult.style.display = 'block';
        this.nextBtn.style.display = 'none';
        this.restartBtn.style.display = 'inline-block';

        const percentage = Math.round((this.score / this.questions.length) * 100);

        this.finalScore.textContent = this.score;
        this.finalTotalQuestions.textContent = this.questions.length;
        this.finalPercentage.textContent = percentage;

        let grade = '';
        let gradeClass = '';

        if (percentage >= 90) {
            grade = '🏆 우수 (Excellent)';
            gradeClass = 'grade-excellent';
        } else if (percentage >= 70) {
            grade = '👍 양호 (Good)';
            gradeClass = 'grade-good';
        } else if (percentage >= 50) {
            grade = '📚 보통 (Fair)';
            gradeClass = 'grade-fair';
        } else {
            grade = '💪 더 분발 (Needs Improvement)';
            gradeClass = 'grade-poor';
        }

        this.resultGrade.textContent = grade;
        this.resultGrade.className = `result-grade ${gradeClass}`;
    }

    restartQuiz() {
        this.quizStarted = false;
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.selectedAnswers = [];

        this.questionCard.style.display = 'block';
        this.quizResult.style.display = 'none';
        this.answerSection.style.display = 'none';
        this.restartBtn.style.display = 'none';
        this.startBtn.style.display = 'inline-block';

        this.questionTitle.textContent = '자바 면접 문제를 시작하세요!';
        this.questionText.textContent = '시작 버튼을 클릭하여 면접 준비를 시작하세요.';

        this.progressElement.style.width = '0%';
        this.scoreElement.textContent = '0';
        this.totalQuestionsElement.textContent = '0';
        this.questionNumberElement.textContent = '0';
        this.totalCountElement.textContent = '0';
    }

    getDifficultyText(difficulty) {
        const difficultyMap = {
            easy: '초급',
            medium: '중급',
            hard: '고급'
        };
        return difficultyMap[difficulty] || difficulty;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new JavaInterviewQuiz();
});
