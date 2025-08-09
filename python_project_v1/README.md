# My Python Package

파이썬 모범 사례를 따르는 패키지 예제입니다.

## 설치

```bash
# 개발 모드로 설치
pip install -e .

# 개발 의존성 포함 설치
pip install -e ".[dev]"
```

## 사용법

```python
from src import hello_world, add_numbers

print(hello_world("World"))  # Hello, World!
print(add_numbers(2, 3))     # 5
```

## 개발 환경 설정

### 가상 환경 생성 및 활성화

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python -m venv venv
source venv/bin/activate
```

### 개발 의존성 설치

```bash
pip install -e ".[dev]"
```

### 코드 품질 도구 실행

```bash
# 코드 포매팅
black src tests
isort src tests

# 린팅
flake8 src tests

# 타입 체킹
mypy src

# 테스트 실행
pytest

# 커버리지 포함 테스트
pytest --cov=src --cov-report=html
```

### Pre-commit 훅 설정

```bash
pre-commit install
```

## 프로젝트 구조

```
.
├── src/                 # 소스 코드
│   ├── __init__.py
│   └── main.py
├── tests/              # 테스트 코드
│   ├── __init__.py
│   └── test_main.py
├── docs/               # 문서
├── pyproject.toml      # 프로젝트 설정
├── README.md           # 프로젝트 설명
└── .gitignore         # Git 무시 파일
```