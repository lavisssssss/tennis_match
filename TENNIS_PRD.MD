# 테니스 동호회 경기 관리 시스템 PRD (AI 최적화 버전)

## 1. 프로젝트 개요

### 프로젝트 이름
Tennis Club Match Manager

### 프로젝트 설명
이 프로젝트는 테니스 동호회의 경기 운영을 효율적으로 관리하기 위한 웹 서비스이다.

서비스는 다음 기능을 제공한다.

- 경기 일정 공지
- 참석 여부 등록
- 출석 체크
- 경기 결과 기록
- 관리자 승인 기반 경기 기록 관리
- Elo 기반 실력 추정
- 실력 기반 복식 팀 매칭

본 시스템은 **지인 중심 테니스 동호회 운영에 최적화된 경량 관리 시스템**을 목표로 한다.

---

# 2. 문제 정의

현재 테니스 동호회는 경기 운영을 다음과 같은 방식으로 관리하는 경우가 많다.

- 카카오톡 공지
- 수기 참석 관리
- 경기 결과 기록 없음
- 실력 기반 팀 구성 어려움

이로 인해 다음 문제가 발생한다.

- 누가 참석하는지 파악하기 어렵다
- 경기 결과가 기록되지 않는다
- 팀 구성 과정에서 시간이 오래 걸린다
- 실력 균형이 맞지 않는 경기가 발생한다

본 서비스는 이러한 문제를 해결하기 위해 **경기 운영, 기록, 매칭을 하나의 시스템에서 관리**한다.

---

# 3. 목표 사용자

### Primary User
테니스를 취미로 즐기는 동호회원

### 사용자 역할

#### Admin
동호회 관리자

권한

- 선수 등록 및 수정
- 경기 일정 생성
- 경기 결과 승인
- Elo 점수 수정
- 출석 관리

---

#### Guest
동호회 회원

권한

- 본인 이름 선택
- 경기 결과 입력
- 참석 신청

회원가입 기능은 없다.

---

# 4. 리그 구조

시스템은 하나의 리그만 운영한다.

규칙

- 테니스 동호회 1개 = 리그 1개
- 실력별 리그 없음
- 복식 경기만 관리
- 모든 선수는 동일 Elo 풀을 공유

---

# 5. 선수 식별 방식

선수는 다음 방식으로 식별된다.


이름 + 연락처 뒷자리 4자리


예시


오형선4025
김철수1234
박영희8921


Guest 사용자는 **dropdown에서 이름을 선택**한다.

선수 등록 및 관리는 **Admin만 가능**하다.

---

# 6. 핵심 기능

## 6.1 경기 일정 공지

Admin은 경기 **매치**(경기 일정)를 생성할 수 있다.

매치 정보

- 날짜
- 장소
- 시작 시간
- 종료 시간
- 설명

예시


날짜: 5월 12일
장소: 잠실 테니스장
시간: 08:00 ~ 11:00


---

## 6.2 참석 신청

회원은 경기 참석 여부를 선택한다.

상태 값


attend
cancel
wait


참석 정보는 **팀 매칭에 사용된다.**

---

## 6.3 출석 체크

경기 당일 Admin이 실제 참석 여부를 확인한다.

출석 데이터는 다음 기능에 활용된다.

- 경기 매칭
- 통계
- 참석률

---

## 6.4 경기 결과 기록

Guest는 경기 결과를 입력할 수 있다.

복식 경기 입력 형식


Team A
player1
player2

Team B
player3
player4

Score
6-4
6-2


경기 입력 시 상태


pending


---

## 6.5 경기 승인

Admin이 경기 결과를 검증한다.

승인 프로세스


Guest 경기 입력
↓
Admin 검토
↓
승인
↓
Elo 반영


경기 상태


pending
approved
rejected


---

## 6.6 Elo 계산

초기 Elo


100


복식 Elo 계산 방식


팀 평균 Elo 사용


예시


Team A
100 + 120 = 평균 110

Team B
90 + 80 = 평균 85


승률 계산은 **팀 평균 Elo 기반**으로 수행한다.

기본 K-factor


20


---

## 6.7 실력 기반 복식 매칭

참석자 목록을 기반으로 팀을 생성한다.

입력


참석자 리스트


출력


Elo 균형 기반 팀


목표


팀 평균 Elo 차이 최소화


예시


Team A
110 + 95

Team B
100 + 105


초기 알고리즘

1. Elo 순 정렬
2. Snake draft
3. 평균 Elo 균형

---

# 7. MVP 범위

MVP에서는 다음 기능만 구현한다.

### 필수 기능

- 경기 공지
- 참석 신청
- 참석 취소
- 출석 체크

### MVP 이후 추가

- 경기 기록
- Elo 계산
- 팀 매칭

---

# 8. 비핵심 기능 (Future)

다음 기능은 향후 추가한다.

### 통계

- 승률
- 참석률
- 팀워크
- 상대 전적

---

### 선수 프로필

Admin 관리

예

- 프로필 사진
- 플레이 스타일
- 선호 포지션

---

### 경기 메모

예


부상 있음
접전 경기
친선 경기


---

# 9. 데이터 모델

## players


id
name
phone_last4
display_name
created_at


---

## sessions (매치)


id
date
location
start_time
end_time
description
created_by
created_at


---

## attendance


id
session_id
player_id
status
created_at


status 값


attend
cancel
wait


---

## matches


id
session_id
teamA_player1
teamA_player2
teamB_player1
teamB_player2
set1_score
set2_score
set3_score
status
created_by
approved_by
created_at


status 값


pending
approved
rejected


---

## ratings


player_id
elo
wins
losses
matches_played
updated_at


---

# 10. UI 페이지

## Home

표시 내용

- 다음 경기 일정
- 참석 신청

---

## Matchs

표시 내용

- 경기 공지(매치 목록)
- 참석 리스트

---

## Match Entry

기능

- 경기 결과 입력

---

## Admin Dashboard

Admin 기능

- 경기 승인
- 선수 관리
- 경기 일정 생성

---

# 11. 성공 기준

서비스가 성공했다고 판단하는 기준

- 사용자가 쉽게 참석 신청 가능
- 경기 결과가 지속적으로 기록됨
- 관리자 승인 흐름 정상 동작
- Elo 점수 계산 정상 수행
- 팀 매칭 기능이 경기 운영에 도움

---

# 12. 기술 스택

Frontend


Next.js


UI


Tailwind CSS


Backend / Database


Supabase


Hosting


Vercel


---

# 13. 개발 단계

## Phase 1

프로젝트 환경 구축

- Next.js
- Supabase
- Tailwind

---

## Phase 2

선수 관리

- players table
- dropdown 선택

---

## Phase 3

경기 일정

- sessions table (매치)
- attendance

---

## Phase 4

경기 기록

- matches table
- match 입력 UI

---

## Phase 5

Admin 승인 시스템

---

## Phase 6

Elo 계산

---

## Phase 7

자동 팀 매칭