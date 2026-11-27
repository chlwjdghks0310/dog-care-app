// 월령별 가이드 카드 데이터 — 자료용 조사(../자료용/자료/2026-11-15-시기별-가이드-콘텐츠.md)에서 옮김. 2026-11-15
// 사실 확인된 정적 데이터. AI가 쓰지 않는다. 브랜드·제품명 없음. 출처는 카드마다.
export const GUIDE_AREAS = [
  { id: "food", label: "사료·식사", ico: "bowl" }, { id: "treats", label: "간식", ico: "bone" }, { id: "water", label: "물", ico: "droplet" },
  { id: "toys", label: "놀이·장난감", ico: "box" }, { id: "walk", label: "산책·운동", ico: "walk" }, { id: "social", label: "사회화", ico: "handHeart" },
  { id: "vaccine", label: "접종", ico: "syringe" }, { id: "parasite", label: "구충·심장사상충", ico: "pipette" }, { id: "neuter", label: "중성화", ico: "stethoscope" },
  { id: "checkup", label: "검진·병원", ico: "building" }, { id: "teeth", label: "치아·양치", ico: "tooth" }, { id: "bath", label: "목욕·미용", ico: "bath" },
  { id: "nails", label: "발톱·귀·눈", ico: "scissors" }, { id: "potty", label: "배변", ico: "toilet" }, { id: "training", label: "훈련", ico: "graduation" },
  { id: "behavior", label: "행동·입질·짖음", ico: "target" }, { id: "sleep", label: "수면·휴식", ico: "bed" }, { id: "alone", label: "혼자 있기", ico: "house" },
  { id: "safety", label: "안전·환경", ico: "alert" }, { id: "season", label: "계절·날씨", ico: "umbrella" }, { id: "weight", label: "체중·성장", ico: "scales" },
  { id: "supplies", label: "용품", ico: "shoppingBag" },
];
export const GUIDE_CARDS = [
  { // 1-①-a
    id: "s1-food-1", stage: 1, area: "food",
    title: "처음엔 원래 먹던 사료 그대로",
    why: [
      "새 집에 온 스트레스에 사료까지 갑자기 바뀌면 배탈이 나기 쉬워요.",
      "영국 동물복지 단체 Blue Cross도 원래 먹던 사료로 시작해 천천히 바꾸라고 해요.",
    ],
    how: [
      "분양처·보호소에 물어 그대로 시작해요. 물어볼 것은 사료 형태(건식·습식), 하루 양, 하루 횟수예요.",
      "바꾸고 싶으면 적응이 끝난 뒤에 해요. 최소 7일에 걸쳐 섞어요. · 1~2일: 새 사료 25% · 3~4일: 50% · 5~6일: 75% · 7일: 100%",
      "매일 변을 봐요. 무르면 이전 비율로 돌아가 며칠 더 머물러요.",
      "고를 때는 건식·습식 같은 형태보다 '성장기용(또는 전 연령용) 완전사료'라는 표시가 있는지 먼저 봐요(WSAVA).",
    ],
    avoid: [
      "첫날부터 새 사료로 확 바꾸기",
      "'홀리스틱·프리미엄' 같은 말만 보고 고르기. 규정된 용어가 아니에요(WSAVA).",
      "날고기 식단. WSAVA는 권하지 않아요.",
      "인터넷 레시피로 만든 화식. 레시피 200개 중 95%가 필수 영양소가 하나 이상 부족했어요(UC Davis).",
    ],
    ask: "\"지금 먹는 사료가 성장기에 맞는 완전사료인가요? 바꾼다면 언제쯤이 좋을까요?\"",
    sources: [
      {"name":"Blue Cross 「Caring for your puppy」","url":"https://www.bluecross.org.uk/advice/dog/caring-for-your-puppy"},
      {"name":"7일 비율표","url":"https://www.petplace.com/article/dogs/pet-health/switching-dog-food"},
      {"name":"WSAVA 사료 고르기","url":"https://wsava.org/wp-content/uploads/2021/04/Selecting-a-pet-food-for-your-pet-updated-2021_WSAVA-Global-Nutrition-Toolkit.pdf"},
    ],
  },
  { // 1-①-b
    id: "s1-food-2", stage: 1, area: "food",
    title: "하루 4번, 작은 아이는 '먹었는지'까지 확인",
    why: [
      "AKC는 6~12주 퍼피에게 하루 4번을 권해요.",
      "아주 어리고, 막 데려왔고, 몸집이 아주 작은 퍼피는 저혈당이 올 수 있어요(AKC). 밥 사이가 길거나, 많이 놀았거나, 춥거나, 스트레스를 받으면 더 쉬워요.",
    ],
    how: [
      "하루 양은 사료 포장 급여표의 체중·월령 칸을 기준으로 해요. 이 양을 4번으로 나눠 매일 같은 시간에 줘요.",
      "그릇은 15분 넘게 두지 않아요(AKC). 실제로 얼마나 먹었는지 봐요(Mar Vista 동물병원).",
      "초소형 퍼피는 하루 4~6번까지 나누라는 동물병원 자료가 있어요(Mar Vista). 횟수는 병원과 정해요.",
      "이가 약해 건사료를 잘 못 씹으면 물에 불려 줘요(Mar Vista).",
      "저혈당 신호가 보일 때: · 축 처짐, 졸려함, 비틀거림, 떨림이면 바로 밥을 줘요. · 밥을 안 먹으면 꿀이나 물엿을 조금 먹이고, 병원에 연락하며 출발해요(AKC). · 의식이 없거나 경련 중이면 입에 붓지 말고 잇몸에 조금 바른 뒤 즉시 병원에 가요(Mar Vista).",
    ],
    avoid: [
      "자동급식기만 믿고 먹었는지 확인하지 않기",
      "무설탕 껌·사탕을 꿀 대신 쓰기. 자일리톨이 개에게 저혈당을 일으켜요(Merck).",
      "의식 없는 아이 입에 물이나 시럽 붓기",
    ],
    ask: "\"우리 아이 체중이면 하루 몇 번, 몇 g이 맞을까요? 저혈당 응급 때 꿀이나 물엿을 써도 될까요?\"",
    sources: [
      {"name":"AKC 퍼피 급여 기본","url":"https://www.akc.org/expert-advice/health/puppy-feeding-fundamentals/"},
      {"name":"AKC 저혈당","url":"https://www.akc.org/expert-advice/health/hypoglycemia-in-dogs/"},
      {"name":"Mar Vista 동물병원 초소형견 저혈당","url":"https://marvistavet.com/toy-breed-hypoglycemia.pml"},
    ],
  },
  { // 1-①-c
    id: "s1-water-1", stage: 1, area: "water",
    title: "물은 늘 신선하게, 우유·사람 음식은 주지 않기",
    why: [
      "퍼피는 탈수가 쉬워요(AKC).",
      "새 식구를 반긴다고 식탁 음식을 나눠 주기 쉬운 시기예요.",
      "초콜릿·포도·자일리톨·양파류는 적은 양도 위험할 수 있어요. 포도는 안전한 양이 알려지지 않았어요(Cornell).",
    ],
    how: [
      "낮에는 물그릇을 늘 채워 둬요. 대략 하루 체중 1kg당 33~65ml예요(AKC 공식을 환산).",
      "배변 연습 중이면 자기 2~3시간 전에 밥·물그릇을 치우고 마지막 배변을 시켜요(AKC).",
      "우유는 주지 않아요(Blue Cross).",
      "다음 음식은 강아지 손이 닿지 않는 곳에 둬요: 초콜릿, 포도·건포도, 자일리톨 든 껌·사탕, 양파·마늘·파.",
      "먹었다면 증상을 기다리지 말고 바로 병원에 전화해요. 무엇을, 얼마나, 몇 시에 먹었는지와 체중을 알려요(ASPCA·Cornell).",
    ],
    avoid: [
      "배변 실수를 줄이려고 낮에 물을 줄이기. AKC는 안 된다고 해요.",
      "집에서 억지로 토하게 하기, 소금물 먹이기",
      "\"한 알쯤은 괜찮다\"는 생각",
    ],
    ask: "\"밤에 갈 수 있는 가까운 24시 병원은 어디인가요?\" (번호를 미리 저장)",
    sources: [
      {"name":"AKC 퍼피 물","url":"https://www.akc.org/expert-advice/health/puppy-drinking-enough-water/"},
      {"name":"Blue Cross 「Caring for your puppy」","url":"https://www.bluecross.org.uk/advice/dog/caring-for-your-puppy"},
      {"name":"ASPCA 피해야 할 사람 음식","url":"https://www.aspca.org/pet-care/aspca-poison-control/people-foods-avoid-feeding-your-pets"},
    ],
  },
  { // 1-②-a
    id: "s1-toys-1", stage: 1, area: "toys",
    title: "장난감은 3종류, 크기는 입보다 크게",
    why: [
      "장난감은 지루함을 덜어 주고 \"씹어도 되는 것\"을 알려 줘요(휴메인 소사이어티).",
      "퍼피는 뭐든 입으로 확인해요.",
      "그래서 너무 작거나 쉽게 부서지는 장난감은 삼키거나 목에 걸릴 수 있어요(AAHA).",
    ],
    how: [
      "종류별로 하나씩 준비해요(휴메인 소사이어티). · 함께 노는 것: 부드러운 공, 로프 · 시간을 끄는 것: 사료를 넣는 물렁한 고무 장난감 · 안정감을 주는 것: 보호자 냄새가 밴 헌 옷·담요",
      "크기는 주둥이보다 크고 입보다 조금 넓게 골라요(AAHA). 물었을 때 장난감이 입 밖으로 보여야 해요.",
      "딱딱함은 두 가지로 확인해요(AAHA). 엄지손톱으로 눌러 자국이 남아야 하고, 손으로 살짝 휘어야 해요.",
      "삑삑이 인형과 로프는 지켜볼 때만 주고, 끝나면 치워요.",
      "일주일마다 몇 개씩 바꿔 꺼내 줘요.",
    ],
    avoid: [
      "이가 부러질 수 있는 것: 뼈, 사슴뿔, 딱딱한 나일론, 생가죽 껌(AAHA)",
      "너무 작은 공",
      "찢어져 솜이나 조각이 나온 장난감을 계속 쓰기",
    ],
    ask: "\"우리 아이 이 상태에는 어느 정도 단단한 씹을거리가 맞을까요?\"",
    sources: [
      {"name":"휴메인 소사이어티 「Dog Toys」","url":"https://www.thehumanesociety.org/dog-toys/"},
      {"name":"AAHA 「Don't Chew On This!」","url":"https://www.aaha.org/resources/dont-chew-on-this/"},
    ],
  },
  { // 1-②-b
    id: "s1-safety-1", stage: 1, area: "safety",
    title: "놀기 전에 집부터, 강아지 눈높이 점검",
    why: [
      "강아지는 닿는 건 다 입으로 조사해요(AKC).",
      "반려동물이 가장 많이 먹는 독 1위는 사람 약·영양제(16.9%), 2위는 음식·음료(16.4%)였어요(ASPCA 2025 집계).",
    ],
    how: [
      "바닥에 엎드려 방마다 30초씩 둘러봐요.",
      "입에 들어갈 크기의 물건을 치워요. 동전, 머리끈, 양말, 단추형 건전지, 자석 같은 것이에요.",
      "전선·충전기는 뽑거나, 덮개를 씌우거나, 가구 뒤로 옮겨요(AKC).",
      "위험한 물건을 정리해요(AKC·ASPCA). · 약·영양제·가방은 높은 곳에 둬요. · 세제는 잠금장 안에 넣어요. · 쓰레기통 뚜껑과 변기 뚜껑은 닫아 둬요.",
      "소파·침대에는 계단이나 경사로를 놓아요. 소형견은 뛰어내리다 앞다리가 부러지는 일이 흔하다는 동물병원 자료가 있어요.",
    ],
    avoid: [
      "처음부터 집 전체를 자유롭게 풀어 주기. AKC가 꼽은 초보 보호자 실수예요.",
      "독성 식물을 바닥에 두기. 소철과 스킨답서스는 개에게 독성이 있어요(ASPCA).",
      "건전지·자석을 삼켰는데 집에서 토하게 하기",
    ],
    ask: "\"삼키면 바로 와야 하는 물건에는 뭐가 있나요?\"",
    sources: [
      {"name":"AKC 퍼피 프루핑","url":"https://www.akc.org/expert-advice/home-living/puppy-proofing-tips-for-your-home-and-yard/"},
      {"name":"ASPCA 2025 중독 TOP10","url":"https://www.aspca.org/news/top-10-toxins-2025"},
      {"name":"ASPCA 식물","url":"https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants/sago-palm"},
    ],
  },
  { // 1-②-c
    id: "s1-sleep-1", stage: 1, area: "sleep",
    title: "30~60분 놀고 푹 재우기",
    why: [
      "퍼피는 하루 18~20시간쯤 자요(AKC).",
      "자극이 너무 많고 지치면 행동이 나빠질 수 있어요(AKC). 첫 2주에 손님 방문과 안아 보기가 몰리면 특히 그래요.",
    ],
    how: [
      "하루를 이 순서로 돌려요(AKC): 깨면 배변 → 밥 → 배변 → 놀이 30~60분 → 낮잠",
      "낮잠은 크레이트나 울타리 안 조용한 자리에서 재워요. 밤 잠자리는 조용하고 어둡게 해요(AKC).",
      "자는 아이는 깨우지 않아요. 꼭 깨워야 하면 몸 대신 이름을 불러요(AKC).",
      "아이들에게도 \"자는 동안은 건드리지 않기\"를 알려 줘요(Blue Cross).",
      "자다가 다리를 움찔대는 건 대개 꿈이에요. 퍼피는 특히 많이 움찔대요(AKC 수석 수의사).",
    ],
    avoid: [
      "자는 아이를 깨워 놀기(Blue Cross)",
      "하루 종일 쉬는 시간 없이 놀아 주기",
    ],
    ask: "\"자다가 다리가 뻣뻣해지고 불러도 안 깨면, 영상을 찍어 가도 될까요?\" 꿈과 발작은 이렇게 달라요(AKC). 꿈 움직임은 짧고(보통 30초 이내) 띄엄띄엄이에요. 발작은 다리가 뻣뻣하고 격하며, 잘 깨지 않아요.",
    sources: [
      {"name":"AKC 퍼피 수면","url":"https://www.akc.org/expert-advice/health/how-much-do-puppies-sleep/"},
      {"name":"AKC 자면서 움찔","url":"https://www.akc.org/expert-advice/lifestyle/why-dog-twitch-in-sleep/"},
      {"name":"Blue Cross 「Caring for your puppy」","url":"https://www.bluecross.org.uk/advice/dog/caring-for-your-puppy"},
    ],
  },
  { // 1-③-a
    id: "s1-social-1", stage: 1, area: "social",
    title: "접종 전 바깥 구경은 '땅 말고 품에서'",
    why: [
      "미국 수의동물행동학회(AVSAB)는 가장 중요한 사회화 시기를 생후 첫 3개월로 봐요. 그래서 접종이 다 끝나기 전에 사회화를 하는 것이 표준 진료여야 한다고 해요.",
      "이유: 3살 미만 개가 죽는 가장 큰 원인은 감염병이 아니라 행동 문제예요. 엄마 개에게서 받은 면역, 1차 접종, 적절한 관리가 함께 있으면 감염 위험은 행동 문제 위험보다 상대적으로 작다고 해요.",
      "국내 수의사도 기사에서 같은 취지로 말했어요. \"접종을 마칠 때까지 절대 밖에 안 나가는 것\"을 문제로 짚었고, 대신 감염·사고에 최대한 주의하라고 했어요.",
    ],
    how: [
      "먼저 다니는 병원에 물어봐요. \"지금 접종 단계에서 어디까지 나가도 되나요?\"",
      "안거나 이동가방·유모차에 태우고 나가요. 집 앞, 아파트 단지, 조용한 벤치에서 5~10분 구경해요.",
      "멀리서 차 소리, 자전거, 우산 쓴 사람을 보게 하고 간식을 줘요.",
      "무서워하는 신호가 보이면 바로 거리를 두거나 집으로 와요. 꼬리를 말거나, 떨거나, 숨으려는 모습이에요.",
      "땅에 내려놓지 않아요. 다른 개 배변이 많은 곳은 피해요.",
    ],
    avoid: [
      "접종 여부를 모르는 개와 코 맞대기",
      "개가 많이 다니는 공원 잔디나 반려견 카페 바닥에 내려놓기",
      "설사·기침이 있는 날 외출하기. AVSAB는 아프지 않을 것을 조건으로 둬요.",
    ],
    ask: "\"지금 접종 단계에서 품에 안고 하는 외출은 괜찮을까요? 우리 동네에 특히 조심할 전염병이 있나요?\"",
    sources: [
      {"name":"AVSAB 「Position Statement on Puppy Socialization」 PDF 사본(오하이오주립대)","url":"https://indoorpet.osu.edu/sites/default/files/imce/Puppy_Socialization_Position_download_-_10-4-14.pdf"},
      {"name":"퍼듀대 소개 페이지","url":"https://caninewelfare.centers.purdue.edu/resource/avsab-puppy-socialization-position-statement"},
      {"name":"국내 기사(동물병원 대표수의사 도움말, 2015)","url":"https://www.sidae.com/article/2015121301368012596"},
    ],
  },
  { // 1-③-b
    id: "s1-walk-1", stage: 1, area: "walk",
    title: "산책 준비는 집 안에서, 하네스·리드 익히기",
    why: [
      "AKC는 집에 온 날부터 집 안에서 리드 연습을 하라고 해요.",
      "소형견은 목줄이 기관을 눌러 기관 허탈을 악화시킬 수 있어 하네스를 많이 권해요(동물병원 안내문).",
      "운동은 따로 시키지 않아도 되는 시기예요.",
    ],
    how: [
      "하네스를 보여 주고 냄새를 맡게 한 뒤 간식을 줘요.",
      "몇 초만 입혔다 벗겨요. 입고 있는 동안 간식을 주거나 놀아 줘요.",
      "가벼운 리드를 달고 집 안에서 끌리게 둬요. 따라오면 간식을 줘요. 지켜볼 때만 해요.",
      "하네스는 손가락 두 개가 들어갈 정도로 맞춰요. 빨리 자라니 자주 다시 맞춰요(Blue Cross).",
      "생후 3개월 전에는 계단과 높은 소파 점프를 줄여요. 대형견 연구에서 이 시기 계단 이용이 고관절 이형성 위험과 연관됐어요. 소형견에도 같은지는 미확인이에요.",
    ],
    avoid: [
      "자동줄(AKC)",
      "크레이트 안에서 하네스를 입혀 두기. 걸릴 위험이 있다는 2차 자료가 있고, 기관 원문은 미확인이에요.",
      "소파에서 뛰어내리게 두기",
    ],
    ask: "\"기침을 하거나 거위 소리 같은 숨소리가 나요. 목줄 대신 하네스가 맞을까요?\"",
    sources: [
      {"name":"AKC 리드줄","url":"https://www.akc.org/content/dog-training/articles/five-quick-tips-for-better-leash-walking-manners/"},
      {"name":"동물병원 기관 허탈 안내문","url":"https://animalcarehospital.vet/sites/site-4271/documents/Tracheal%20collapse.pdf"},
      {"name":"Blue Cross 「Caring for your puppy」","url":"https://www.bluecross.org.uk/advice/dog/caring-for-your-puppy"},
    ],
  },
  { // 1-④-a
    id: "s1-checkup-1", stage: 1, area: "checkup",
    title: "데려오고 첫 주 안에 첫 병원",
    why: [
      "Blue Cross는 데려오면 바로 건강검진을 받으라고 해요.",
      "접종·구충을 끊기지 않게 이어 가야 해요.",
      "첫 방문이 즐거우면 앞으로 병원을 덜 무서워해요(VCA).",
    ],
    how: [
      "분양처·보호소에서 접종·구충 기록을 받아요. 날짜와 종류가 다 있어야 해요.",
      "병원을 고를 때 볼 것: · 집에서 가까운지 · 야간 응급 때 어디로 안내하는지 · 진료비가 게시돼 있는지. 2024년 1월 5일부터 모든 동물병원의 의무예요(농식품부). · 질문하기 편한지",
      "챙겨 갈 것: 기록, 변 사진(또는 샘플), 질문 3개, 작은 간식",
      "진찰대 위에서 간식을 받으며 진찰받게 부탁해요(VCA Fear Free).",
      "다음 접종·구충 날짜를 받아 적어요(앱 알림과 연결).",
    ],
    avoid: [
      "아플 때만 병원 가기(Blue Cross)",
      "병원 가는 날만 이동장 꺼내기. \"이동장 = 병원\"이 돼요.",
    ],
    ask: "\"다음 접종·구충은 언제 무엇을 하나요? 지금 체형·체중은 괜찮나요?\"",
    sources: [
      {"name":"Blue Cross 「Caring for your puppy」","url":"https://www.bluecross.org.uk/advice/dog/caring-for-your-puppy"},
      {"name":"농식품부 보도자료(진료비 게시·중대진료 동의)","url":"https://www.mafra.go.kr/bbs/mafra/68/330605/artclView.do"},
      {"name":"동물병원 진료비용 현황 공개","url":"https://www.animalclinicfee.or.kr"},
    ],
  },
  { // 1-④-b
    id: "s1-vaccine-1", stage: 1, area: "vaccine",
    title: "접종·구충 일정 끊기지 않게 이어 가기",
    why: [
      "엄마 개에게서 받은 항체가 백신을 방해할 수 있어요. 그래서 종합백신은 몇 번 맞았는지보다 16주령 이상에 마지막 회차를 맞는 게 핵심이에요(WSAVA).",
      "장내 기생충은 퍼피에게 흔하고, 사람에게 옮는 것도 있어요(CAPC).",
    ],
    how: [
      "종합백신(홍역·아데노·파보, 핵심백신) · 대략 6~9주에 시작하고, 2~4주 간격으로 맞아요. · 16주 이상에 마무리해요(WSAVA). 출처마다 범위가 조금 달라요. · 국내 병원은 '5차 접종'처럼 일정이 다를 수 있어요. 다니는 병원 일정을 따라요.",
      "장내 구충(CAPC) · 2개월까지는 2주마다, 2~6개월은 매달 해요. · 이미 몇 번 했는지 기록으로 확인하고 이어서 해요.",
      "심장사상충 예방은 늦어도 8주에는 시작해요. 그리고 1년 내내 해요(AHS·CAPC).",
      "변 검사는 첫해에 최소 4번 해요(CAPC).",
      "배변은 맨손으로 만지지 말고, 치운 뒤 손을 씻어요(CAPC).",
    ],
    avoid: [
      "집에서 자가 접종. 2개월령 퍼피가 부작용으로 3주 치료받은 국내 사례 기사가 있어요.",
      "큰 개용 약을 나눠 먹이기. 약 용량은 체중에 따라 달라져요(AHS).",
    ],
    ask: "\"코로나 장염·켄넬코프 백신이 우리 아이 생활에 필요할까요?\" WSAVA(2017)는 코로나 백신을 권하지 않았어요. 2024년 개정에서도 그대로인지는 미확인이에요. 켄넬코프 백신은 선택(비핵심) 백신이에요.",
    sources: [
      {"name":"WSAVA 접종 지침(2017 학회 발표)","url":"https://www.vin.com/doc/?id=8506324"},
      {"name":"WSAVA 일정 표","url":"https://pmc.ncbi.nlm.nih.gov/articles/PMC7166871/table/t1"},
      {"name":"CAPC 일반 지침","url":"https://capcvet.org/guidelines/general-guidelines/"},
    ],
  },
  { // 1-④-c
    id: "s1-safety-2", stage: 1, area: "safety",
    title: "동물등록, 2개월령부터 30일 안에",
    why: [
      "반려 목적으로 기르는 2개월령 이상 개는 등록이 의무예요(농식품부).",
      "잃어버렸을 때 가장 빨리 가족에게 돌아오는 방법이에요.",
      "2026년 11월은 등록·인식표 집중단속 기간으로 안내됐어요(농식품부 2026-09-13).",
    ],
    how: [
      "국가동물보호정보시스템에서 가까운 등록대행 동물병원을 찾아요.",
      "접종하는 날 함께 신청하면 한 번에 끝나요.",
      "방식을 골라요. · 내장형: 마이크로칩. 농식품부가 권해요. · 외장형: 목걸이형. 외출할 때 꼭 달아야 해요.",
      "수수료는 서울시 기준 내장형 1만 원, 외장형 3천 원이에요. 칩값은 따로 들어요.",
      "이사하거나 연락처가 바뀌면 30일 안에, 잃어버리면 10일 안에 신고해요.",
    ],
    avoid: [
      "미루기. 과태료는 최대 100만 원이에요(서울시 안내 기준 1차 20만 원).",
      "인식표만 달고 등록은 안 하기. 인식표와 등록은 별개예요.",
    ],
    ask: "\"내장칩은 접종과 같은 날 해도 되나요? 우리 아이 체구에 괜찮나요?\"",
    sources: [
      {"name":"농식품부 보도자료(2026-09-13)","url":"https://www.mafra.go.kr/bbs/home/792/579241/artclView.do"},
      {"name":"서울시 「펫티켓 길라잡이」","url":"https://news.seoul.go.kr/env/archives/552695"},
      {"name":"국가동물보호정보시스템","url":"https://www.animal.go.kr"},
    ],
  },
  { // 1-⑤-a
    id: "s1-potty-1", stage: 1, area: "potty",
    title: "배변은 '자주 데려가고, 성공하면 바로 칭찬'",
    why: [
      "8~10주 퍼피는 최소 1시간에 한 번 배변 기회를 줘야 해요(SF SPCA).",
      "실수를 혼내면 보호자 앞에서 싸는 걸 무서워해 숨어서 싸게 돼요(SF SPCA).",
    ],
    how: [
      "장소는 한 곳으로 정해요. 패드라면 같은 자리에 같은 종류를 깔고, 위치를 자주 바꾸지 않아요.",
      "이럴 때 패드로 데려가요(AKC). · 일어나자마자 · 밥·물을 먹고 5~30분 안 · 낮잠에서 깬 직후 · 놀이가 끝났을 때 · 자기 전",
      "바닥 냄새를 맡거나, 빙빙 돌거나, 갑자기 사라지면 바로 패드로 데려가요.",
      "끝나자마자 칭찬하고 간식을 줘요. 간식은 패드 바로 옆에서 줘요(패드 위 간식은 의견이 엇갈려요).",
      "혼자 둘 때는 울타리 안에 패드와 잠자리를 같이 둬요. 실수한 자리는 효소 세정제로 냄새까지 지워요.",
    ],
    avoid: [
      "코를 대고 혼내기, 때리기",
      "나중에 발견한 실수를 혼내기. 아무 반응 없이 조용히 치워요.",
      "\"7일 만에 100%\" 같은 기대. 보통 몇 주~몇 달 걸려요.",
    ],
    ask: "\"소변을 아주 자주 조금씩 보거나 피가 섞여요. 훈련 문제가 아니라 요로 문제일 수 있나요?\"",
    sources: [
      {"name":"SF SPCA 퍼피 배변 훈련 PDF","url":"https://www.sfspca.org/wp-content/uploads/2023/02/dog_behavior_house-training_puppy.pdf"},
      {"name":"AKC 배변 훈련 타임라인","url":"https://www.akc.org/learn/akc-training/puppy-potty-training-timeline/"},
    ],
  },
  { // 1-⑤-b
    id: "s1-sleep-2", stage: 1, area: "sleep",
    title: "첫날밤과 크레이트(하우스)는 '편한 방'으로",
    why: [
      "처음 며칠 밤 낑낑대는 건 흔해요(Blue Cross).",
      "크레이트나 울타리는 배변 연습, 안전, 이동·입원 때 모두 쓰여요(SF SPCA).",
      "벌주는 곳으로 쓰면 안 돼요(AKC).",
    ],
    how: [
      "크기는 서고, 돌고, 눕기 편할 만큼이면 돼요. 너무 크면 한쪽을 화장실로 써요(SF SPCA).",
      "첫날밤에는 침실 가까이 두고, 점점 원하는 자리로 옮겨요(Blue Cross, AKC).",
      "1단계: 간식을 안에 던져 넣어요. 들어가면 칭찬하고, 문은 몇 초만 닫아요(SF SPCA).",
      "2단계: 사료를 채운 고무 장난감을 넣고 문을 닫아요. 1~20분으로 시간을 섞어요(SF SPCA).",
      "8~10주는 한 번에 최대 1시간이에요(밤잠 제외, SF SPCA). · 밤에 깨서 낑낑대면 배변일 수 있어요. · 조용히 패드에 데려갔다가 놀아 주지 말고 다시 재워요.",
    ],
    avoid: [
      "억지로 밀어 넣기",
      "벌로 넣기",
      "낑낑댈 때 바로 열어 주기. 몇 초라도 조용할 때 열어요(SF SPCA).",
    ],
    ask: "\"몇 분도 못 견디고 계속 울어요. 행동 상담을 받을 수 있는 곳이 있나요?\"",
    sources: [
      {"name":"SF SPCA 크레이트 훈련 PDF","url":"https://www.sfspca.org/wp-content/uploads/2023/02/dog_commands_crate-training-puppy.pdf"},
      {"name":"AKC 크레이트 훈련","url":"https://www.akc.org/expert-advice/training/how-to-crate-train-your-dog-in-9-easy-steps/"},
      {"name":"Blue Cross 「Caring for your puppy」","url":"https://www.bluecross.org.uk/advice/dog/caring-for-your-puppy"},
    ],
  },
  { // 1-⑤-c
    id: "s1-training-1", stage: 1, area: "training",
    title: "하루 5분 훈련과 '가족 규칙 하나로'",
    why: [
      "AKC는 데려온 날(보통 8주쯤)부터 간단한 훈련을 시작할 수 있다고 해요.",
      "\"그때그때 다른 규칙\"은 AKC가 꼽은 초보 보호자 실수 5가지 중 하나예요.",
      "국내 보호자가 양육 포기를 고민한 이유 1위는 행동 문제(47.8%)였어요(농식품부 2024 국민의식조사).",
    ],
    how: [
      "가족이 모여 신호 말과 규칙을 하나로 정해요. · 신호 말 예: \"앉아\", \"이리 와\", \"좋아\" · 규칙 예: 소파에 올라와도 되는지",
      "이름 부르면 쳐다보기부터 해요. 이름을 부르고, 쳐다보면 사료 한 알을 줘요(UC Davis·AKC).",
      "한 번에 5~10분만 하고, 꼭 성공으로 끝내요(AKC).",
      "보상은 하루 사료에서 덜어 낸 알갱이로 줘요(AKC).",
      "'앉아'는 기다렸다 잡아요. 스스로 앉으면 \"옳지\" 하고 사료를 줘요(AKC).",
    ],
    avoid: [
      "이름을 여러 번 반복하기. 이름을 무시하는 게 쉬워져요(AKC).",
      "엉덩이를 눌러 앉히기",
      "리드를 홱 당기거나 소리치기(AKC·AVSAB)",
    ],
    ask: "\"훈련 보상으로 사료를 쓰면 하루 양을 어떻게 맞추면 될까요?\"",
    sources: [
      {"name":"AKC 5가지 기본 신호","url":"https://www.akc.org/expert-advice/training/teach-your-puppy-these-5-basic-commands/"},
      {"name":"AKC 초보 보호자가 하지 말 것 5가지","url":"https://www.akc.org/expert-advice/training/five-things-puppy-owners-should-never-do/"},
      {"name":"UC Davis 리콜 훈련 PDF","url":"https://www.vetmed.ucdavis.edu/sites/g/files/dgvnsk491/files/inline-files/Recall_Training_in_Dogs.pdf"},
    ],
  },
  { // 1-⑥-a
    id: "s1-nails-1", stage: 1, area: "nails",
    title: "만지기 연습부터, 발·귀·입",
    why: [
      "퍼듀대 연구팀은 아주 어릴 때(3~14주) 만지기 경험이 특히 중요하다고 해요. 그 경험은 '괜찮은' 정도가 아니라 좋은 경험이어야 한대요.",
      "발톱 깎기, 양치, 귀 확인, 병원 진찰은 모두 \"만져도 괜찮아\"에서 시작해요.",
    ],
    how: [
      "강아지가 차분할 때 사료 몇 알을 준비해요.",
      "다리를 쓰다듬고 간식, 발을 잠깐 쥐었다 놓고 간식을 줘요.",
      "귀 바깥을 만지고 간식, 입술을 살짝 들고 간식을 줘요.",
      "만질 때만 간식, 멈추면 간식도 끝이에요(퍼듀대).",
      "몸이 굳거나 간식을 안 먹으면 멈추고 한 단계 전으로 돌아가요(VCA).",
    ],
    avoid: [
      "버둥대는 아이를 꽉 붙잡고 끝까지 하기. VCA는 무서워하면 진행하지 말라고 해요.",
      "한 번에 오래 하기",
    ],
    ask: "\"진찰 때 귀나 입을 볼 때 간식을 줘도 될까요?\"",
    sources: [
      {"name":"VCA 만지기·밥그릇 연습","url":"https://vcahospitals.com/bond/know-your-pet/puppy-behavior-and-training---handling-and-food-bowl-exercises"},
      {"name":"퍼듀대 퍼피 몸 만지기","url":"https://caninewelfare.centers.purdue.edu/resource/quick-tips-for-success-puppy-body-handling-croney-research-group"},
    ],
  },
  { // 1-⑥-b
    id: "s1-bath-1", stage: 1, area: "bath",
    title: "목욕은 서두르지 않기, 물수건으로 충분",
    why: [
      "첫 2주는 적응이 먼저예요.",
      "AKC 기사 속 미용사(수의사 아님)는 3~4개월까지는 따뜻한 물수건이면 충분하다고 해요.",
      "작은 퍼피는 체온을 빨리 잃어요. 그래서 겨울엔 특히 조심해요.",
    ],
    how: [
      "더러운 곳만 따뜻한 물수건으로 닦고 바로 말려요.",
      "눈곱과 눈물 자국은 미지근한 물이나 식염수를 묻힌 솜으로 닦고 말려요.",
      "엉덩이에 변이 묻었으면 그 부분만 씻어요.",
      "꼭 씻겨야 한다면: · 강아지용 샴푸와 미지근한 물을 써요. · 얼굴을 씻을 때는 귀 입구를 접어 물이 들어가지 않게 해요(AKC). · 속털까지 완전히 말려요.",
      "드라이어 소리는 멀리서 약하게 틀어 놓고 간식을 줘요(소리 익히기).",
    ],
    avoid: [
      "사람 샴푸(AKC)",
      "젖은 채로 두기",
      "드라이어를 한곳에 오래 대기",
    ],
    ask: "\"접종 전후 목욕은 언제부터 괜찮나요?\" \"접종 전 목욕 금지\"의 근거는 찾지 못했어요. 그래서 병원 안내를 따라요.",
    sources: [
      {"name":"AKC 퍼피 목욕","url":"https://www.akc.org/expert-advice/health/bathing-puppy-bath-shampoo-care/"},
      {"name":"눈 닦기(동물병원)","url":"https://www.vetwest.com.au/pet-library/eyes-cleaning-checking-and-staining/"},
    ],
  },
  { // 1-⑥-c
    id: "s1-teeth-1", stage: 1, area: "teeth",
    title: "양치 1단계, 치약 맛보기",
    why: [
      "Merck 보호자용 자료는 매일 양치가 가장 좋다고 하고, 소형견에 잇몸병이 더 많다고 해요.",
      "젖니일 때 \"입 만지기 = 맛있는 시간\"을 만들어 두면 영구치 때 수월해요.",
    ],
    how: [
      "1~3일: 반려견용 치약을 손가락에 조금 묻혀요. 냄새를 맡고 핥게 하고 칭찬해요.",
      "4~6일: 입술을 살짝 들고 손가락으로 앞니·송곳니 잇몸을 문질러요.",
      "매일 아주 짧게 해요. 못 한 날이 있어도 괜찮아요(SF SPCA: 일주일에 몇 번도 의미가 있어요).",
      "칫솔 단계는 시기 2에서 해요.",
    ],
    avoid: [
      "사람 치약. 자일리톨이 들어 있을 수 있어요(Merck·SF SPCA).",
      "억지로 입 벌리기",
      "물려고 할 때 몸으로 벌주기",
    ],
    ask: "\"젖니 상태는 괜찮나요? 칫솔은 언제부터 써도 될까요?\"",
    sources: [
      {"name":"Merck 개 치아 질환(보호자용)","url":"https://www.merckvetmanual.com/dog-owners/digestive-disorders-of-dogs/dental-disorders-of-dogs"},
      {"name":"SF SPCA 양치법","url":"https://www.sfspca.org/blog/how-to-brush-your-dogs-teeth/"},
      {"name":"콜로라도주립대 수의병원 양치법","url":"https://csuveterinaryhealth.org/how-to-brush-your-dogs-teeth/"},
    ],
  },
  { // 2-①-a
    id: "s2-food-1", stage: 2, area: "food",
    title: "양은 그릇 말고 몸으로 맞추기",
    why: [
      "빠르게 자라는 시기라 같은 양이 금방 모자라거나 남아요.",
      "AKC는 \"그릇 말고 강아지를 보라\"고 하고, 매주 체중을 재라고 해요.",
    ],
    how: [
      "3개월부터는 하루 3번이에요(AKC). 초소형견은 3~4번 이상 주기도 해요. 횟수는 병원과 정해요(Mar Vista는 초소형 퍼피에게 4~6번).",
      "매주 같은 요일에 체중을 재서 기록해요.",
      "2주마다 손으로 갈비뼈를 만져 봐요(WSAVA 체형 점수 4~5). · 이상적인 몸: 갈비뼈가 지방이 지나치지 않게 만져지고, 위에서 볼 때 허리가 보여요. · 털 많은 아이는 눈으로 말고 손으로 확인해요.",
      "갈비뼈가 안 만져지면 조금 줄이고, 도드라지면 조금 늘려요. 포장 급여표도 다시 봐요.",
      "소형견 성견 사료 전환은 대개 7~9개월이에요. 아직 아니에요(AKC).",
    ],
    avoid: [
      "하루 종일 사료를 부어 두기",
      "체중이 2주 넘게 안 늘었는데 지켜보기만 하기",
    ],
    ask: "\"지금 체형 점수가 몇 점인가요? 하루 몇 kcal가 맞을까요?\"",
    sources: [
      {"name":"AKC 퍼피 급여 기본","url":"https://www.akc.org/expert-advice/health/puppy-feeding-fundamentals/"},
      {"name":"AKC 퍼피 식단","url":"https://www.akc.org/learn/dog-health/healthy-dog-puppy-diet-nutrition-feeding/"},
      {"name":"WSAVA 체형 점수 PDF","url":"https://wsava.org/wp-content/uploads/2020/01/Body-Condition-Score-Dog.pdf"},
    ],
  },
  { // 2-①-b
    id: "s2-treats-1", stage: 2, area: "treats",
    title: "훈련 간식은 '하루 10% 안', 사료 알갱이로",
    why: [
      "사회화·훈련으로 보상이 확 늘어나는 시기예요.",
      "WSAVA는 간식을 하루 칼로리의 10% 미만으로 하고, 밥을 대신하면 안 된다고 해요.",
    ],
    how: [
      "아침에 하루 사료를 재요. 그중 일부를 훈련·사회화용 통에 덜어 둬요. AKC도 사료 알갱이를 보상으로 쓰라고 해요.",
      "병원이나 낯선 소리처럼 특별한 상황용 간식은 아주 작게 잘라요. · 익힌 닭가슴살 28g이 47kcal예요(WSAVA). · 하루 간식 한도는 2kg 성견 기준 14kcal쯤이에요(WSAVA 표). · 퍼피는 하루 칼로리를 먼저 계산하고 그 10%로 잡아요.",
      "간식을 준 날은 밥을 그만큼 줄여요.",
      "씹는 간식은 지켜볼 때만 줘요(WSAVA).",
      "땅콩버터는 자일리톨이 없는 것만 줘요(WSAVA).",
    ],
    avoid: [
      "뼈, 뿔, 말린 발굽(WSAVA·AAHA)",
      "돼지귀 같은 생 동물성 간식. 세균 오염 위험이 있어요(WSAVA·AAHA).",
      "치즈·소시지 조각. 작아 보여도 칼로리가 커요(AKC).",
    ],
    ask: "\"훈련 간식까지 합치면 하루에 얼마가 적당할까요?\"",
    sources: [
      {"name":"WSAVA 간식 주기 PDF","url":"https://wsava.org/wp-content/uploads/2024/06/Feeding-treats-to-your-dog-v2.pdf"},
      {"name":"AKC 간식 몇 개까지","url":"https://www.akc.org/expert-advice/nutrition/how-many-treats-can-dog-have/"},
      {"name":"AAHA 「Don't Chew On This!」","url":"https://www.aaha.org/resources/dont-chew-on-this/"},
    ],
  },
  { // 2-②-a
    id: "s2-toys-1", stage: 2, area: "toys",
    title: "이갈이 대비, 물렁한 고무 장난감",
    why: [
      "영구치로 바뀌기 시작하는 건 약 3.5~4개월이고, 앞니부터예요(VCA).",
      "이가 날 때 씹으면 잇몸 통증이 덜해요(AAHA).",
      "사회화기가 끝날 무렵부터 입질과 씹기가 늘어나요.",
    ],
    how: [
      "강아지용 물렁한 고무 장난감을 준비하고, 안에 사료를 넣어 줘요(AKC).",
      "물에 적셔 얼린 수건이나 얼린 고무 장난감은 지켜볼 때만 줘요.",
      "다른 걸 씹고 있으면 혼내지 말고 장난감과 바꿔 줘요.",
      "같은 자리에 젖니와 영구치가 두 줄로 보이면 병원에 가요. 소형견에 더 흔해요(VCA).",
    ],
    avoid: [
      "얼음 조각, 딱딱한 뼈, 사슴뿔, 단단한 껌(AAHA)",
      "사람 아기용 치발기",
    ],
    ask: "\"빠지지 않고 남은 젖니가 있나요? 뺀다면 언제가 좋을까요?\"",
    sources: [
      {"name":"VCA 잔존 유치","url":"https://vcahospitals.com/know-your-pet/retained-deciduous-teeth-baby-teeth-in-dogs"},
      {"name":"AKC 이갈이 장난감","url":"https://www.akc.org/expert-advice/health/puppy-teething-pain-toy/"},
      {"name":"AAHA 「Don't Chew On This!」","url":"https://www.aaha.org/resources/dont-chew-on-this/"},
    ],
  },
  { // 2-②-b
    id: "s2-toys-2", stage: 2, area: "toys",
    title: "하루 한 끼는 노즈워크로",
    why: [
      "AKC는 머리 쓰는 운동이 몸 운동만큼 중요하다고 해요.",
      "아직 산책을 못 하는 퍼피가 실내에서 에너지를 쓰기 좋아요.",
      "성견 20마리를 2주 동안 본 연구에서, 노즈워크를 한 개들이 더 '낙관적'으로 반응했어요(Duranton 2019). 퍼피 연구는 아니에요.",
    ],
    how: [
      "노즈워크 매트나 접은 수건 틈에 한 끼 사료를 숨겨요. 처음엔 보이게 숨겨요(AKC).",
      "머핀 틀 칸에 사료를 넣고, 삼킬 수 없는 크기의 공으로 덮어요. 지켜볼 때만 해요.",
      "터그 놀이는 장난감으로만 해요. 이가 피부에 닿으면 바로 놀이를 멈춰요(ASPCA).",
      "숨바꼭질로 '이리 와'를 복습해요(AKC).",
      "5~10분 놀고 나면 쉬게 해요.",
    ],
    avoid: [
      "높은 곳 점프, 계단 놀이(Krontveit 대형견 연구)",
      "손발로 하는 레슬링",
      "매트를 씹는데 그대로 두기",
    ],
    ask: "\"우리 아이 견종은 관절을 조심해야 하나요? 점프 놀이는 언제부터 괜찮을까요?\"",
    sources: [
      {"name":"AKC 두뇌 게임","url":"https://www.akc.org/expert-advice/health/fun-cognitive-training-games-for-dogs/"},
      {"name":"Duranton & Horowitz 2019","url":"https://doi.org/10.1016/j.applanim.2018.12.009"},
      {"name":"ASPCA 퍼피 입질","url":"https://www.aspca.org/pet-care/dog-care/common-dog-behavior-issues/mouthing-nipping-and-biting-puppies"},
    ],
  },
  { // 2-③-a
    id: "s2-social-1", stage: 2, area: "social",
    title: "접종한 개 친구와 퍼피 교실",
    why: [
      "AVSAB는 퍼피 교실을 7~8주부터 시작할 수 있다고 해요. 3개월 전 퍼피 교실은 감염 위험을 줄인 환경에서 사회화하는 좋은 방법이라고 해요.",
      "조건(AVSAB): · 첫 수업 7일 전까지 최소 1회 접종을 마쳐요. · 첫 구충을 마쳐요. · 수업 기간 내내 접종 일정을 지켜요.",
    ],
    how: [
      "퍼피 교실이나 모임을 고를 때 볼 것: · 참가하는 개의 접종 기록을 확인하는지 · 바닥을 청소·소독하는지 · 무서워하는 아이를 쉬게 해 주는지 · 국내 퍼피 교실 현황은 미확인이에요. 동물병원이나 훈련 시설에 물어봐요.",
      "개 친구는 접종을 마친 건강하고 순한 개 한 마리부터 만나요. 집이나 깨끗한 곳에서 만나요.",
      "처음엔 5분 안쪽으로 짧게 하고, 서로 편해 보이면 조금씩 늘려요.",
      "한쪽이 피하거나 숨으면 잠깐 떼어 놓고 쉬게 해요.",
    ],
    avoid: [
      "접종 여부를 모르는 개가 많은 곳",
      "무서워하는데 \"익숙해지라고\" 계속 두기. 서두르지 말라는 자료가 공통이에요.",
      "아픈 날 가기(AVSAB 조건)",
    ],
    ask: "\"지금 접종 기록이면 퍼피 교실에 가도 될까요? 근처에 운영하는 곳을 아시나요?\"",
    sources: [
      {"name":"AVSAB 「Position Statement on Puppy Socialization」 PDF 사본(오하이오주립대)","url":"https://indoorpet.osu.edu/sites/default/files/imce/Puppy_Socialization_Position_download_-_10-4-14.pdf"},
      {"name":"AVMA 보도","url":"https://www.avma.org/News/JAVMANews/Pages/081001c.aspx"},
      {"name":"퍼듀대 사회화 안내 PDF","url":"https://caninewelfare.centers.purdue.edu/wp-content/uploads/2021/10/02-9-28-21-Handout01_Quick-Tips-for-Success-Puppy-Socialization-and-Early-Exposure_F....pdf"},
    ],
  },
  { // 2-③-b
    id: "s2-walk-1", stage: 2, area: "walk",
    title: "첫 산책은 병원 '오케이' 뒤에, 5~10분 냄새 맡기",
    why: [
      "땅에서 걷는 산책을 언제 시작하는지는 기관 기준을 찾지 못했어요. 흔한 안내는 \"마지막 접종 후 약 2주\"예요.",
      "병원마다 달라서 병원 안내가 먼저예요.",
      "첫 산책은 운동이 아니라 냄새 맡고 구경하는 시간이에요.",
    ],
    how: [
      "마지막 접종 때 물어봐요. \"언제부터 땅에서 걸어도 되나요?\"",
      "준비물: 몸에 맞는 하네스, 가벼운 약 1.8m 리드(AKC), 인식표, 배변 봉투, 작은 간식, 물티슈",
      "조용한 시간에 조용한 길에서 5~10분만 걸어요.",
      "냄새를 실컷 맡게 두고, \"가자!\" 하고 밝게 불러요. 옆으로 오면 간식을 줘요(AKC).",
      "무서워하면 멈추고 안아서 돌아와요. 다음 날 다시 해요.",
    ],
    avoid: [
      "자동줄(AKC)",
      "\"개월 수 × 5분\"을 정답처럼 쓰기. 연구 근거가 없다고 수의사가 말했어요.",
      "다른 개에게 바로 다가가기. 상대 보호자에게 먼저 물어봐요.",
    ],
    ask: "\"산책을 시작하면 켄넬코프 같은 선택 백신도 필요할까요?\"",
    sources: [
      {"name":"수의사 인용 기사(산책 시간)","url":"https://petsradar.com/advice/how-far-can-a-puppy-walk"},
      {"name":"AKC 리드줄","url":"https://www.akc.org/content/dog-training/articles/five-quick-tips-for-better-leash-walking-manners/"},
      {"name":"AKC 리드 문제","url":"https://www.akc.org/expert-advice/training/expert-tips-dog-leash-issues/"},
    ],
  },
  { // 2-③-c
    id: "s2-season-1", stage: 2, area: "season",
    title: "겨울에 시작하는 산책은 짧게, 발 닦기까지",
    why: [
      "작은 개와 퍼피는 열을 빨리 잃어요(ASPCA).",
      "제설제는 발바닥을 자극하고, 핥으면 탈이 날 수 있어요(VCA).",
      "11월에 데려온 퍼피라면 첫 산책이 한겨울과 겹쳐요.",
    ],
    how: [
      "따뜻한 낮, 바람이 약할 때 짧게 나가요.",
      "작은 개는 옷을 입혀요(ASPCA). 신발은 집에서 먼저 연습해요.",
      "하얀 제설제가 뿌려진 길과 눈 덩어리는 피하고, 눈을 먹지 않게 해요.",
      "돌아오면 미지근한 물이나 물티슈로 발·다리·배를 닦아요. 발가락 사이까지 말려요(VCA·ASPCA).",
      "떨거나, 처지거나, 귀·발이 차가우면 실내로 와서 말리고 담요로 감싸요. 심하면 병원에 가요(PetMD).",
    ],
    avoid: [
      "핫팩이나 전기장판을 몸에 바로 대기. 화상 위험이 있어요.",
      "주차장 바닥에 흘린 액체 핥기. 부동액일 수 있고 개에게 치명적이에요(ASPCA).",
      "추운 날 차 안에 혼자 두기(ASPCA)",
    ],
    ask: "\"우리 아이 체구면 몇 도 아래에서는 실내 놀이로 바꾸는 게 좋을까요?\" 기관이 정한 기준 온도는 미확인이에요.",
    sources: [
      {"name":"VCA 제설제","url":"https://vcahospitals.com/resources/lifestyle-dog/hazards-safety/dog-be-careful-with-ice-melt"},
      {"name":"ASPCA 겨울 안전","url":"https://www.aspca.org/news/winter-weather-upon-us-are-you-and-your-pets-prepared-read-our-safety-tips"},
      {"name":"PetMD 저체온","url":"https://www.petmd.com/dog/conditions/cardiovascular/dog-hypothermia"},
    ],
  },
  { // 2-④-a
    id: "s2-vaccine-1", stage: 2, area: "vaccine",
    title: "마지막 종합백신은 16주 이상, 광견병도 챙기기",
    why: [
      "WSAVA는 엄마 개 항체 때문에 마지막 회차를 16주령 이상에 맞추라고 해요.",
      "광견병은 국내에서 3개월령 이상 개의 접종 대상이에요. 법에 따른 접종이고, 지자체가 안내하고 있어요.",
    ],
    how: [
      "접종 수첩에서 지금 몇 차인지, 마지막 회차가 16주 이후로 잡혀 있는지 확인해요.",
      "광견병은 3개월령 이상에 맞고, 이후 매년 맞아요(지자체 안내). 지자체 일제 접종이 있는지 구청에 물어봐요.",
      "26주(약 6개월)쯤 추가 접종이 이상적이라고 해요(WSAVA 2017). 중성화 상담 때 같이 물어봐요.",
      "접종 날 설사·구토·기침이 있으면 먼저 알려요(일반 상식, 출처 미확인).",
      "접종 뒤 24시간 안에 평소대로 돌아오지 않으면 병원에 연락해요(수의사 답변). · 얼굴이 붓거나, 두드러기가 나거나, 토하면 바로 병원에 가요(일반 안내, 기관 원문 미확인).",
    ],
    avoid: [
      "집에서 자가 접종",
      "마지막 회차를 16주 전에 끝내고 \"다 맞았다\"고 생각하기",
    ],
    ask: "\"마지막 접종이 16주 이후로 잡혀 있나요? 항체검사가 필요할까요?\"",
    sources: [
      {"name":"WSAVA 접종 지침(2017 학회 발표)","url":"https://www.vin.com/doc/?id=8506324"},
      {"name":"WSAVA 일정 표","url":"https://pmc.ncbi.nlm.nih.gov/articles/PMC7166872/table/jsap2_12431-tbl-0001"},
      {"name":"광견병 지자체 안내","url":"https://www.yeonsu.go.kr/main/part/economy/animal_vaccination.asp"},
    ],
  },
  { // 2-④-b
    id: "s2-parasite-1", stage: 2, area: "parasite",
    title: "기생충은 매달, 겨울에도 쉬지 않기",
    why: [
      "CAPC는 2~6개월 퍼피에게 매달 장내 구충을 권해요. 심장사상충·벼룩·진드기도 1년 내내 관리하라고 해요.",
      "한국에도 심장사상충이 있어요. 2022년 대구 반려견 조사에서 7.7%가 양성이었어요(학회 발표 보도).",
    ],
    how: [
      "매달 같은 날 예방해요. 심장사상충, 장내, 외부 기생충을 다 챙겨요. 날짜는 앱 알림으로 걸어 둬요.",
      "체중이 늘면 용량이 바뀔 수 있어요. 매번 체중을 재요(AHS).",
      "첫해 변 검사는 최소 4번이에요(CAPC). 접종 갈 때 변을 챙겨 가요.",
      "산책을 시작하면 돌아와서 몸을 확인해요. 귀 안팎, 목줄 아래, 겨드랑이, 발가락 사이, 꼬리 밑을 손으로 훑어봐요.",
      "진드기를 찾으면 손으로 비틀어 뜯지 말고 병원에서 떼요.",
    ],
    avoid: [
      "\"겨울엔 쉬어도 된다\"고 스스로 정하기. AHS·CAPC는 1년 내내 권해요.",
      "큰 개 약을 나눠 먹이기",
    ],
    ask: "\"심장사상충·장내·외부 기생충을 한 번에 막는 방법이 우리 아이에게 맞나요? 체중이 늘면 언제 바꿔야 하나요?\"",
    sources: [
      {"name":"CAPC 일반 지침","url":"https://capcvet.org/guidelines/general-guidelines/"},
      {"name":"미국 심장사상충학회(AHS)","url":"https://www.heartwormsociety.org/pet-owner-resources/heartworm-basics"},
      {"name":"국내 양성률(데일리벳)","url":"https://www.dailyvet.co.kr/?p=186717"},
    ],
  },
  { // 2-④-c
    id: "s2-neuter-1", stage: 2, area: "neuter",
    title: "중성화는 지금 '상담'만 시작하기",
    why: [
      "AAHA 2019 지침이 제안한 시기(소형견 = 예상 성견 체중 약 20kg 미만): · 암컷: 첫 발정 전(5~6개월) · 수컷: 6개월",
      "그 전에 이야기해 둬야 준비할 수 있어요.",
      "\"몇 개월이 정답\"은 없어요. 견종, 체중, 성별에 따라 달라요(AAHA, UC Davis 연구).",
    ],
    how: [
      "마지막 접종 무렵(4~5개월)에 상담을 잡아요.",
      "질문을 미리 적어 가요(아래 '병원에 물어볼 때').",
      "국내 법도 알아 두면 좋아요. 전신마취 수술 전에는 병원이 이렇게 해야 해요(농식품부·데일리벳). · 필요성·방법·후유증을 설명해요. · 서면 동의를 받아요. · 예상 진료비를 미리 알려 줘요.",
      "수술 뒤에는 급여량을 다시 맞춰요(VCA: 살이 찌는 건 과식과 운동 부족 때문이에요).",
    ],
    avoid: [
      "\"한 번 새끼를 낳게 하면 차분해진다\"는 믿음. VCA는 그런 효과가 없다고 해요.",
      "\"성격이 바뀐다\"는 믿음. VCA는 바뀌지 않는다고 해요.",
      "하지 않기로 한 선택을 탓하기. 시기와 여부는 보호자와 수의사가 함께 정해요.",
    ],
    ask: "\"예상 성견 체중이면 몇 개월쯤이 좋을까요?\" (암컷) \"첫 발정 전에 할까요?\" · AAHA: 첫 발정 1번 뒤 수술하면 유선 종양 8%, 2번 뒤면 26%로 보고됐어요. · VCA: 첫 발정 전 수술하면 유선암 가능성이 0.5% 미만이에요. (수컷) \"고환은 둘 다 내려왔나요?\" \"수술 전 혈액검사, 예상 비용, 회복 기간은요?\" · VCA: 대부분 5~10일 뒤 평소 활동으로 돌아가요. \"남은 젖니 정리나 추가 접종을 같이 할 수 있나요?\"",
    sources: [
      {"name":"AAHA 2019 중성화 시기","url":"https://www.aaha.org/aaha-guidelines/life-stage-canine-2019/spay-and-neuter-timing/"},
      {"name":"같은 지침 「Concepts to Consider」","url":"https://www.aaha.org/aaha-guidelines/life-stage-canine-2019/spay-and-neuter-timing/concepts-to-consider/"},
      {"name":"VCA 「Spaying in Dogs」","url":"https://vcahospitals.com/know-your-pet/spaying-in-dogs"},
    ],
  },
  { // 2-⑤-a
    id: "s2-social-2", stage: 2, area: "social",
    title: "사회화 체크리스트, '많이'보다 '좋게'",
    why: [
      "AVSAB: 첫 3개월은 사회성이 두려움보다 앞서는 시기예요.",
      "AKC: 나쁜 경험 한 번이 그동안의 노력을 되돌릴 수 있어요.",
      "3개월이 지났어도 늦은 건 아니에요. 같은 원칙으로 천천히 계속해요(3개월 이후 효과에 관한 기관 수치는 미확인).",
    ],
    how: [
      "사람: 아이, 노인, 모자·우산 쓴 사람, 택배 기사 · 강아지가 먼저 다가가게 해요. · 간식은 그 사람이 건네요.",
      "소리: 청소기, 드라이어, 초인종, 엘리베이터, 차 소리 · 아주 작게 틀어 놓고 간식을 주거나 놀아 줘요. · 아파트라면 초인종 연습이 특히 도움이 돼요.",
      "바닥: 타일, 매트, 잔디, 엘리베이터 바닥. 강아지 속도대로 밟게 해요.",
      "물건·장소: 이동장, 유모차, 차, 동물병원 대기실 · 접종 없는 날 병원에 들러 간식만 받고 오는 '해피 비지트'도 좋아요.",
      "하루 몇 가지만 해요. 무엇을 했는지 기록해 둬요.",
    ],
    avoid: [
      "억지로 안겨 주거나 붙잡아 두기",
      "무서워하는 신호를 무시하기 · 꼬리를 말아 넣음, 흰자가 보이는 눈, 귀를 젖힘 · 상황에 맞지 않는 하품, 입술 핥기(AKC·ASPCA)",
    ],
    ask: "\"접종이 없는 날 대기실에 들러 간식만 받고 가도 될까요?\"",
    sources: [
      {"name":"AVSAB 「Position Statement on Puppy Socialization」 PDF 사본(오하이오주립대)","url":"https://indoorpet.osu.edu/sites/default/files/imce/Puppy_Socialization_Position_download_-_10-4-14.pdf"},
      {"name":"AKC 초보 보호자가 하지 말 것 5가지","url":"https://www.akc.org/expert-advice/training/five-things-puppy-owners-should-never-do/"},
      {"name":"퍼듀대 사회화 안내 PDF","url":"https://caninewelfare.centers.purdue.edu/wp-content/uploads/2021/10/02-9-28-21-Handout01_Quick-Tips-for-Success-Puppy-Socialization-and-Early-Exposure_F....pdf"},
    ],
  },
  { // 2-⑤-b
    id: "s2-behavior-1", stage: 2, area: "behavior",
    title: "입질은 \"아야\" 다음 '잠깐 멈춤'",
    why: [
      "퍼피의 입질은 대부분 정상이에요. 강아지는 놀다가 세게 물면 놀이가 멈추는 경험으로 무는 힘 조절을 배워요(ASPCA).",
      "이갈이와 겹쳐서 입질이 가장 늘어나는 시기예요.",
    ],
    how: [
      "세게 물면 짧게 \"아야!\" 하고 손에 힘을 빼요. 멈추거나 핥으면 칭찬하고 다시 놀아요(ASPCA).",
      "소리가 안 통하면 잠깐 쉬어요(ASPCA). · 손을 빼고 10~20초 무시해요. · 또 물면 일어나서 10~20초 자리를 떠요. · 그다음 다시 놀아 줘요.",
      "\"아야\"는 15분에 3번 넘게 반복하지 않아요(ASPCA).",
      "손이나 발을 씹으려 하면 장난감으로 바꿔 줘요. 터그 장난감을 손 닿는 곳에 둬요.",
      "쓰다듬을 때 물면, 다른 손으로 작은 간식을 주면서 만져요(ASPCA).",
      "높은 소리에 더 흥분하는 아이도 있어요. 그러면 소리 없이 바로 멈춰요(Dogs Trust).",
    ],
    avoid: [
      "손가락을 얼굴 앞에서 흔들며 놀자고 하기",
      "물 때 손을 확 빼기. 더 달려들게 해요.",
      "코 때리기, 목덜미 흔들기, 입에 손가락 넣기. 더 세게 물거나 겁을 먹을 수 있어요(ASPCA).",
      "놀이 자체를 막기",
    ],
    ask: "\"놀 때 말고 무섭거나 만질 때 물어요. 행동 상담이 필요할까요?\" ASPCA: 겁이나 좌절로 무는 경우는 전문가 상담을 권해요.",
    sources: [
      {"name":"ASPCA 퍼피 입질","url":"https://www.aspca.org/pet-care/dog-care/common-dog-behavior-issues/mouthing-nipping-and-biting-puppies"},
      {"name":"Dogs Trust","url":"https://www.dogstrust.org.uk/dog-advice/unwanted-behaviours/stop-your-dog-chewing-mouthing"},
    ],
  },
  { // 2-⑤-c
    id: "s2-training-1", stage: 2, area: "training",
    title: "'앉아 → 풀어 주는 말 → 이리 와' 순서로",
    why: [
      "이름에 반응하게 됐다면 기본 신호를 하나씩 더할 때예요.",
      "특히 '이리 와'는 산책을 시작하기 전에 집 안에서 다져 두면 안전해요.",
    ],
    how: [
      "앉아: 간식을 코앞에 대고 천천히 머리 위로 올려요. 엉덩이가 닿으면 간식을 줘요. 손짓을 익히면 그 직전에 \"앉아\"라고 말해요(AKC).",
      "풀어 주는 말(\"좋아\"): 간식을 바닥에 던지면서, 움직이는 순간 그 말을 해요(AKC). '기다려'보다 먼저 가르쳐요.",
      "기다려: 시간을 먼저 늘리고 거리는 나중에 늘려요. 일어나면 혼내지 말고 더 짧게 다시 해요(AKC).",
      "이리 와(AKC·UC Davis): · 실내에서 이름과 \"이리 와\"를 말할 때마다 간식을 줘요. · 다음엔 간식을 던지고 멀어지며 불러요. · 오면 크게 칭찬해요.",
      "\"이리 와\"는 한 번만, 밝게 말해요. 오기 시작하는 순간부터 보상해요(UC Davis).",
    ],
    avoid: [
      "늦게 온 개를 혼내기. UC Davis는 아주 늦게 왔어도, 말썽을 부렸어도 절대 혼내지 말라고 해요.",
      "목욕·발톱 깎기처럼 싫은 일 직전에 부르기",
      "손을 뻗어 확 잡기(AKC)",
    ],
    ask: "\"훈련을 시작하기 전에 확인할 건강 문제(귀·관절 등)가 있을까요?\" (UC Davis: 훈련 전 건강 확인)",
    sources: [
      {"name":"AKC 5가지 기본 신호","url":"https://www.akc.org/expert-advice/training/teach-your-puppy-these-5-basic-commands/"},
      {"name":"UC Davis 리콜 훈련 PDF","url":"https://www.vetmed.ucdavis.edu/sites/g/files/dgvnsk491/files/inline-files/Recall_Training_in_Dogs.pdf"},
      {"name":"싫은 일에 부르지 않기","url":"https://nylabone.com/dog101/how-to-teach-your-dog-to-come-when-called"},
    ],
  },
  { // 2-⑤-d
    id: "s2-alone-1", stage: 2, area: "alone",
    title: "혼자 있기 연습, 몇 초부터",
    why: [
      "한국 보호자 약 80%가 하루 한 번 이상 반려동물을 혼자 두고, 평균 시간은 5시간 54분이에요(KB경영연구소 2025 보고서 보도).",
      "퍼피가 한 번에 견딜 수 있는 시간은 짧아요(SF SPCA 크레이트 기준). · 11~12주: 최대 2시간 · 13~16주: 최대 3시간",
    ],
    how: [
      "다른 방에 몇 초 → 현관 밖 1분 → 쓰레기 버리기 5분 → 30분 순서로 몇 주에 걸쳐 늘려요(ASPCA). 긴 외출 사이에 짧은 외출도 섞어요(SF SPCA).",
      "나갈 때 인사는 짧게 하고, 오래 걸리는 사료 장난감을 줘요(ASPCA).",
      "돌아와서는 강아지가 진정된 뒤에 반겨요(ASPCA).",
      "출근하는 집이면 낮에 누군가 한 번 이상 들르게 해요. 초소형 퍼피는 끼니 간격이 길어지지 않게 해요.",
    ],
    avoid: [
      "돌아와서 어질러진 걸 보고 혼내기. 강아지는 연결하지 못해요(ASPCA).",
      "크레이트를 못 견디는 아이를 계속 넣기. 아기 울타리로 방 하나를 쓰는 방법도 있어요(ASPCA).",
    ],
    ask: "\"혼자 남으면 몇 분 안에 짖고 뜯어요. 분리불안인지 확인해 볼 수 있을까요?\" ASPCA: 혼내지 말고 의학적 원인부터 확인하라고 해요.",
    sources: [
      {"name":"ASPCA 분리불안","url":"https://www.aspca.org/pet-care/dog-care/common-dog-behavior-issues/separation-anxiety"},
      {"name":"SF SPCA 크레이트 훈련 PDF","url":"https://www.sfspca.org/wp-content/uploads/2023/02/dog_commands_crate-training-puppy.pdf"},
      {"name":"KB 보고서 보도","url":"https://globalpetindustry.com/news/south-korean-pets-left-alone-almost-6-hours-a-day-study-reveals/"},
    ],
  },
  { // 2-⑥-a
    id: "s2-teeth-1", stage: 2, area: "teeth",
    title: "양치는 칫솔 단계로, 이갈이 땐 살살",
    why: [
      "잇몸염은 잘 닦으면 되돌릴 수 있어요. 하지만 치주염까지 가면 되돌릴 수 없어요(Merck).",
      "이갈이가 시작되는 시기라 잇몸이 예민할 수 있어요(VCA).",
    ],
    how: [
      "7~9일 차: 손가락 칫솔이나 거즈로 바깥 면 몇 개를 닦아요(SF SPCA·CSU 단계).",
      "10일 차부터: 작은 칫솔을 잇몸 쪽 45도로 대고, 가볍게 앞뒤로 닦아요. 바깥 면만 닦아도 돼요(CSU·Merck).",
      "앞니 → 송곳니 → 어금니 순서로 범위를 늘려요.",
      "칫솔을 싫어하면 거즈로 최소 2~3일에 한 번 닦아요(Merck).",
      "덴탈 껌은 양치를 대신하지 않아요. 고른다면 VOHC(수의구강건강위원회) 인증을 확인해요(CSU·AAHA).",
    ],
    avoid: [
      "칫솔모가 납작해질 만큼 세게 누르기(SF SPCA)",
      "사람 치약",
      "피 나는 잇몸을 계속 닦기",
    ],
    ask: "\"입 냄새가 심하거나 잇몸이 빨개요. 남은 젖니도 같이 봐 주실 수 있나요?\"",
    sources: [
      {"name":"Merck 개 치아 질환(보호자용)","url":"https://www.merckvetmanual.com/dog-owners/digestive-disorders-of-dogs/dental-disorders-of-dogs"},
      {"name":"콜로라도주립대 수의병원 양치법","url":"https://csuveterinaryhealth.org/how-to-brush-your-dogs-teeth/"},
      {"name":"SF SPCA 양치법","url":"https://www.sfspca.org/blog/how-to-brush-your-dogs-teeth/"},
    ],
  },
  { // 2-⑥-b
    id: "s2-nails-1", stage: 2, area: "nails",
    title: "발톱 한두 개씩, 귀는 '보이는 곳만'",
    why: [
      "시기 1의 발 만지기 연습을 실제 관리로 옮길 때예요.",
      "퍼피 발톱은 짧게 자주 다듬는 게 좋아요(동물병원 안내문).",
      "귀는 자주 닦을수록 좋은 게 아니에요(코넬 인용).",
    ],
    how: [
      "발톱깎이를 발에 대고 소리만 들려준 뒤 간식을 줘요. 이때는 자르지 않아요(AKC).",
      "하루에 발톱 한두 개만 끝을 조금 잘라요. · 밝은 발톱은 분홍 혈관 앞까지만 잘라요. · 검은 발톱은 더 조금씩 잘라요.",
      "혈관을 잘랐다면 지혈 가루를 대고 몇 분 눌러요. 10분 넘게 피가 나면 병원에 가요.",
      "귀는 냄새나 귀지가 보일 때만 닦아요. 강아지용 세정제를 묻힌 솜이나 거즈로 보이는 곳만 닦아요.",
      "그라인더도 선택지예요. 이것도 소리부터 익혀요(AKC).",
    ],
    avoid: [
      "면봉을 귓속에 넣기. 귀지를 더 깊이 밀어 넣을 수 있어요(코넬 인용).",
      "하루에 발톱을 다 자르려고 붙잡기",
    ],
    ask: "\"머리를 자주 흔들고 귀를 긁어요. 귀 염증이나 귀 진드기인지 봐 주세요.\"",
    sources: [
      {"name":"AKC 발톱","url":"https://www.akc.org/expert-advice/health/how-to-trim-dogs-nails-safely/"},
      {"name":"동물병원 안내문(발톱·귀)","url":"https://www.collegemanorvet.com/dog/nail-trimming-ear-cleaning"},
      {"name":"퍼듀대 발톱 PDF","url":"https://caninewelfare.centers.purdue.edu/wp-content/uploads/2026/04/Nail-trimming-for-dogs.pdf"},
    ],
  },
  { // 2-⑥-c
    id: "s2-bath-1", stage: 2, area: "bath",
    title: "빗질은 짧게 자주, 첫 목욕은 3개월 이후",
    why: [
      "퍼피 빗질의 목적은 \"빗질은 괜찮은 거야\"를 배우는 거예요(VCA·퍼듀대 원칙).",
      "털 많은 견종은 엉킴을 막는 게 목욕보다 빗질이에요.",
    ],
    how: [
      "빗을 보여 주고 냄새를 맡게 한 뒤 간식을 줘요.",
      "아주 부드러운 슬리커 브러시로 등과 옆구리를 털 방향으로 몇 번만 빗어요. 처음엔 1~2분이면 돼요.",
      "빗질은 일주일에 2~3번, 짧게 해요.",
      "샴푸 목욕은 3개월 이후, 한 달에 한 번쯤이 한 예예요(AKC 미용사). · 출처마다 다르니 피부 상태에 맞춰 정해요. · 목욕 전에 빗질을 하고, 헹굼은 \"한 번 더\" 해요(AKC).",
      "드라이어는 약한 바람으로 계속 움직이며, 속털까지 완전히 말려요(AKC).",
    ],
    avoid: [
      "털이 많은 이중모를 바짝 밀기. 털이 다시 다 자라는 데 12~24개월 걸릴 수 있어요(미네소타대 수의피부과 교재).",
      "바짝 마른 털을 그냥 빗기",
      "귀에 물 들어가게 두기. 귀 염증이 생길 수 있어요(AKC).",
    ],
    ask: "\"털이 몇 달째 안 자라거나 좌우 대칭으로 빠져요. 털갈이인가요, 진료가 필요한가요?\"",
    sources: [
      {"name":"VCA 만지기·밥그릇 연습","url":"https://vcahospitals.com/bond/know-your-pet/puppy-behavior-and-training---handling-and-food-bowl-exercises"},
      {"name":"퍼듀대 퍼피 몸 만지기","url":"https://caninewelfare.centers.purdue.edu/resource/quick-tips-for-success-puppy-body-handling-croney-research-group"},
      {"name":"AKC 퍼피 목욕","url":"https://www.akc.org/expert-advice/health/bathing-puppy-bath-shampoo-care/"},
    ],
  },
  { // 3-1-1
    id: "s3-food-1", stage: 3, area: "food",
    title: "하루 3번, 양은 그릇보다 몸을 보고 정해요",
    why: [
      "3~6개월은 빨리 자라는 때라, 하루 4번 먹던 밥을 이 사이에 3번으로 줄여요(AKC).",
      "사료마다 열량이 달라 양은 포장 급여표에서 시작하고, 맞는지는 아이 몸을 보고 판단해요.",
      "AKC는 \"그릇 말고 강아지를 보라\"고 해요.",
    ],
    how: [
      "사료 포장 급여표에서 지금 체중·월령 칸을 찾고, 하루 양을 3번으로 나눠요. 예: 하루 60g이면 20g씩.",
      "밥그릇은 15분이 지나면 치워요(AKC).",
      "매주 같은 요일에 체중을 재요(AKC). 2주마다 손으로 체형을 봐요. 갈비뼈가 지방에 덮이지 않고 만져지고, 위에서 볼 때 허리가 보이면 9점 중 4~5점, 곧 이상적인 체형이에요(WSAVA).",
      "털이 많은 아이는 눈으로 보지 말고 손으로 만져서 확인해요.",
      "2kg 안팎의 초소형 퍼피는 끼니 간격이 길어지지 않게 3~4번으로 나눠도 돼요. 16주쯤까지 하루 최대 6번이라는 수의사 감수 자료도 있어요.",
    ],
    avoid: [
      "밥그릇을 하루 종일 두기. 덜 먹는 걸 늦게 알아챌 수 있어요(VCA).",
      "퍼피 다이어트. 자라는 중이라 체중이 느는 게 정상이에요. 줄이고 싶으면 병원과 먼저 상의해요.",
    ],
    ask: "\"지금 체형 점수가 몇 점인가요? 급여량을 이대로 둬도 될까요?\" \"이 체구면 한 끼 거를 때 저혈당을 걱정해야 하나요?\"",
    sources: [
      {"name":"AKC 퍼피 급여 기본","url":"https://www.akc.org/expert-advice/health/puppy-feeding-fundamentals/"},
      {"name":"WSAVA 체형 점수(BCS)","url":"https://wsava.org/wp-content/uploads/2020/01/Body-Condition-Score-Dog.pdf"},
      {"name":"VCA 대형견 퍼피 영양(종일 급여 주의)","url":"https://vcahospitals.com/know-your-pet/nutritional-requirements-of-large-and-giant-breed-puppies"},
    ],
  },
  { // 3-1-2
    id: "s3-treats-1", stage: 3, area: "treats",
    title: "이갈이 간식은 '차갑고, 말랑하고, 작게'",
    why: [
      "3.5~4개월부터 앞니부터 영구치로 바뀌어요(VCA).",
      "잇몸이 아파 뭐든 씹으려 해요.",
      "이때 너무 단단한 걸 씹으면 이가 부러질 수 있어요(AAHA).",
    ],
    how: [
      "차갑게 한 채소·과일을 씹게 해 줘요. 수의 치과 전문의가 쓴 글은 차갑거나 얼린 당근·블루베리·그린빈을 소개해요(PetMD). AAHA도 아기 당근·그린빈·사과 조각·블루베리를 권해요.",
      "물렁한 고무 장난감에 불린 사료를 채워 얼려요. 사료는 하루 급여량에서 덜어 써요. 간식 넣는 고무 장난감은 혼자 시간을 보내기 좋은 장난감이에요(휴메인 소사이어티). 얼린 장난감은 지켜볼 때만 줘요.",
      "물에 적셔 30분쯤 얼린 수건도 지켜볼 때만 써요.",
      "간식은 개수가 아니라 하루 열량의 10% 미만이에요. 훈련용 간식과 사람 음식까지 다 포함해요(WSAVA, AKC).",
    ],
    avoid: [
      "뼈(익힌 것·생것), 사슴뿔, 말린 발굽, 돼지귀, 생가죽 껌. 이가 부러지거나 막히거나 세균 오염 위험이 있어요(AAHA, WSAVA).",
      "얼음 조각. 퍼피 이에 너무 단단하고 통째로 삼킬 수 있어요(dvm360).",
      "포도(AAHA: 신부전 위험), 자일리톨이 든 땅콩버터(WSAVA).",
      "사람 아기용 치발기. 강아지용만 써요.",
      "씹다가 삼킬 만한 크기로 자른 단단한 조각(크기 기준 수치는 미확인).",
    ],
    ask: "\"잇몸이 붓고 피가 조금 비치는데 이갈이로 볼 수 있나요?\"",
    sources: [
      {"name":"VCA 잔존 유치(이갈이 시작 시기)","url":"https://vcahospitals.com/know-your-pet/retained-deciduous-teeth-baby-teeth-in-dogs"},
      {"name":"PetMD 「Puppy Teeth」(Mallory Kanwal DVM, DAVDC)","url":"https://www.petmd.com/dog/care/puppy-teeth-everything-you-need-know"},
      {"name":"AAHA 「Don't Chew On This!」","url":"https://www.aaha.org/resources/dont-chew-on-this/"},
    ],
  },
  { // 3-1-3
    id: "s3-water-1", stage: 3, area: "water",
    title: "물은 낮엔 마음껏, 밤엔 2~3시간 전에 치워요",
    why: [
      "퍼피는 탈수가 쉬워요.",
      "배변 훈련 중이라고 낮에 물을 줄이면 안 되고, 물을 아끼면 그릇을 지키는 행동이 생길 수도 있어요(AKC).",
    ],
    how: [
      "낮에는 깨끗한 물을 늘 둬요(AKC).",
      "하루 기준은 체중 1kg당 약 33~65ml예요. 2kg이면 약 65~130ml(AKC 공식을 ml로 바꿈).",
      "재는 법: 아침에 계량컵으로 붓고, 다음 날 같은 시간에 남은 양을 빼요.",
      "배변 훈련 중이면 자기 2~3시간 전에 밥·물그릇을 치우고 마지막 배변을 시켜요. 시간은 매일 같게 해요(AKC).",
    ],
    avoid: [
      "낮에 물 제한하기(AKC).",
      "많이 논 날, 더운 날 물을 그대로 두기. 더 필요해요(AKC).",
    ],
    ask: "\"하루 100ml/kg 넘게 마시는 날이 며칠 이어지는데 검사가 필요할까요?\" (많이 마신다고 보는 기준, 영국 수의 전문병원 자료) 피부를 잡았다 놓으면 늦게 돌아오거나 잇몸이 끈적하면 탈수 신호예요(AKC). 바로 연락해요.",
    sources: [
      {"name":"AKC 퍼피 물","url":"https://www.akc.org/expert-advice/health/puppy-drinking-enough-water/"},
      {"name":"다음증 기준(영국 수의 전문병원)","url":"https://vetspecialists.co.uk/fact-sheets-post/polydipsia-in-dogs-and-cats-increased-drinking-fact-sheet/"},
    ],
  },
  { // 3-2-1
    id: "s3-toys-1", stage: 3, area: "toys",
    title: "씹는 장난감, 사기 전에 손톱으로 눌러 봐요",
    why: [
      "이갈이 때는 씹기가 잇몸 통증을 덜어 줘요(AAHA).",
      "물렁한 고무가 통증을 덜어 준다고 AKC도 말해요.",
      "그런데 너무 단단하거나 작은 장난감은 이를 부러뜨리거나 목에 걸릴 수 있어요(AAHA).",
    ],
    how: [
      "엄지손톱 테스트: 손톱으로 눌러 자국이 안 남으면 너무 딱딱해요(AAHA).",
      "휨 테스트: 손으로 살짝 휘어야 해요(AAHA).",
      "무릎 테스트: 무릎에 톡 쳐서 아프면 너무 딱딱해요(수의 치과의사).",
      "크기: 주둥이보다 크고 입보다 조금 넓게. 세게 씹는 아이는 한 사이즈 위로(AAHA). 물었을 때 입 밖으로 안 보이면 너무 작아요.",
      "장난감은 일주일마다 몇 개씩 바꿔 꺼내 주면 더 오래 좋아해요(휴메인 소사이어티).",
    ],
    avoid: [
      "사슴뿔, 단단한 나일론·플라스틱, 뼈, 말린 발굽(AAHA).",
      "삑삑이 인형을 혼자 있을 때 주기. 소리 나는 부품을 뜯어 삼킬 수 있어 지켜볼 때만 줘요(휴메인 소사이어티).",
      "로프·실 장난감을 혼자 씹게 두기. 실을 삼키면 장이 막힐 수 있어요.",
      "테니스공을 씹기용으로 주기. 던지기 놀이용이에요.",
      "이런 장난감은 버려요: 조각이 떨어짐, 날카로운 모서리, 솜이 보임(AAHA).",
    ],
    ask: "\"한쪽으로만 씹고 잇몸에서 피가 나는데 이가 부러졌는지 봐 주시겠어요?\"",
    sources: [
      {"name":"AAHA 「Don't Chew On This!」","url":"https://www.aaha.org/resources/dont-chew-on-this/"},
      {"name":"AKC 이갈이 장난감","url":"https://www.akc.org/expert-advice/health/puppy-teething-pain-toy/"},
      {"name":"휴메인 소사이어티 「Dog Toys」","url":"https://www.thehumanesociety.org/dog-toys/"},
    ],
  },
  { // 3-2-2
    id: "s3-toys-2", stage: 3, area: "toys",
    title: "밥 한 끼를 노즈워크 놀이로",
    why: [
      "AKC는 머리 쓰는 운동이 몸 운동만큼 중요하다고 해요.",
      "냄새로 먹이를 찾는 놀이를 2주 한 개들이 더 '낙관적'으로 반응했다는 연구도 있어요(성견 20마리, Duranton 2019).",
      "접종이 끝나기 전, 실내에서 에너지를 쓰기 좋아요.",
    ],
    how: [
      "노즈워크 매트(스너플 매트)에 한 끼 사료를 숨겨요(AKC). 처음엔 겉에 보이게, 점점 깊이.",
      "머핀 틀 칸에 사료를 넣고 삼킬 수 없는 크기의 공으로 덮어요(AKC).",
      "\"뜨겁다·차갑다\" 게임: 간식을 숨기고, 가까워지면 신나는 목소리로 알려 줘요(AKC).",
      "한 번에 5~10분이면 충분해요(훈련 세션 길이에 맞춤, 기관 기준 미확인).",
    ],
    avoid: [
      "간식을 따로 늘리기. 사료 총량 안에서 해요(WSAVA 10%와 연결).",
      "DIY 장난감(종이컵·그릇)을 혼자 두기. 꼭 지켜볼 때만, 끝나면 치워요(AKC).",
      "매트를 씹기 시작하면 바로 치워요.",
    ],
    ask: "먹는 양이 갑자기 줄면 먹이 카드 기준으로 상담해요.",
    sources: [
      {"name":"AKC 「Brain Games for Dogs」","url":"https://www.akc.org/expert-advice/health/fun-cognitive-training-games-for-dogs/"},
      {"name":"Duranton & Horowitz 2019","url":"https://doi.org/10.1016/j.applanim.2018.12.009"},
    ],
  },
  { // 3-3-1
    id: "s3-walk-1", stage: 3, area: "walk",
    title: "첫 산책은 '운동'보다 '냄새 맡기'",
    why: [
      "종합백신 마지막 회차는 16주령 이상에 맞는 게 핵심이라(WSAVA), 땅을 밟는 산책은 대개 이 무렵 시작해요.",
      "언제부터 괜찮은지는 병원마다 달라요.",
      "첫 산책은 운동이 아니라 바깥 냄새와 소리에 익숙해지는 시간이에요.",
    ],
    how: [
      "집 안에서 먼저 하네스를 입히고 간식 → 리드줄을 달고 집 안 걷기(AKC: 집에 온 날부터 리드 연습).",
      "조용한 시간·조용한 길에서 5~10분.",
      "냄새를 실컷 맡게 두고, \"가자!\" 밝게 부른 뒤 옆에 오면 간식(AKC).",
      "무서워하면 멈추고 안아서 돌아와요. 다음 날 다시.",
      "겨울엔 따뜻한 낮에 짧게, 작은 아이는 옷을 입혀요. 돌아와서 발·배를 미지근한 물이나 물티슈로 닦고 발가락 사이까지 말려요(ASPCA, VCA).",
    ],
    avoid: [
      "\"월령 × 5분\" 규칙을 정답처럼 쓰기. 연구 근거가 없다는 수의사 의견이 있어요.",
      "자동줄. 가벼운 약 1.8m 리드줄이 좋아요(AKC).",
      "소형견에게 목줄만 쓰기. 목을 눌러 기관 허탈을 악화시킬 수 있어 하네스를 권해요(동물병원 안내문).",
      "접종이 끝나기 전 땅에 내려놓기. 그때까진 안거나 유모차로 구경해요(AVSAB 사회화 조건과 연결).",
    ],
    ask: "\"마지막 접종 후 언제부터 땅에서 걸어도 될까요?\" \"산책 중 '거위 소리' 같은 기침이 나요. 기관 문제일까요?\"",
    sources: [
      {"name":"WSAVA 접종 지침(2017 발표문)","url":"https://www.vin.com/doc/?id=8506324"},
      {"name":"AKC 리드줄","url":"https://www.akc.org/expert-advice/training/expert-tips-dog-leash-issues/"},
      {"name":"VCA 제설제·발 관리","url":"https://vcahospitals.com/resources/lifestyle-dog/hazards-safety/dog-be-careful-with-ice-melt"},
    ],
  },
  { // 3-3-2
    id: "s3-walk-2", stage: 3, area: "walk",
    title: "3개월이 넘으면 줄은 2m 이하, 엘리베이터에선 짧게",
    why: [
      "동물보호법 시행규칙은 3개월 미만을 직접 안고 나갈 때만 줄 없이 외출을 허용해요.",
      "3개월이 넘으면 아파트 산책에도 법으로 정한 규칙이 적용돼요.",
    ],
    how: [
      "목줄·가슴줄은 길이 2m 이하(또는 잠금장치 있는 이동장)(시행규칙 제11조).",
      "엘리베이터·복도 같은 건물 안 공용공간에서는 안거나, 줄의 목덜미·손잡이 쪽을 잡아 움직이지 않게 해요(시행규칙 제11조).",
      "인식표에 이름·보호자 연락처·동물등록번호를 적어요(법 제16조, 시행규칙 제12조).",
      "배설물은 바로 치워요(법 제16조).",
    ],
    avoid: [
      "긴 줄을 풀어 둔 채 걷기. 위반하면 50만 원 이하 과태료예요(법 제101조).",
      "인식표와 동물등록을 같은 것으로 생각하기. 둘은 따로예요(서울시 안내).",
    ],
    ask: "\"등록대행 병원인가요? 접종 날 내장형 등록도 같이 할 수 있나요?\"",
    sources: [
      {"name":"동물보호법(국가법령정보센터)","url":"https://www.law.go.kr/법령/동물보호법"},
      {"name":"동물보호법 시행규칙","url":"https://www.law.go.kr/법령/동물보호법시행규칙"},
      {"name":"서울시 「펫티켓 길라잡이」","url":"https://news.seoul.go.kr/env/archives/552695"},
    ],
  },
  { // 3-3-3
    id: "s3-walk-3", stage: 3, area: "walk",
    title: "계단·높은 소파 점프는 줄이고, 흙길·잔디에서 스스로 탐색",
    why: [
      "대형견 4견종 501마리 연구에서, 생후 3개월까지 계단을 오르내린 강아지는 고관절 이형성 위험이 높았고, 목줄 없이 바깥에서 움직인 강아지는 위험이 낮았어요(Krontveit 2012).",
      "대형견 연구라 소형견에 그대로 맞는지는 모르지만, 무리한 점프를 줄여서 손해 볼 건 없어요.",
    ],
    how: [
      "소파·침대 앞에 낮은 계단이나 경사로를 두고, 내려올 땐 안아 줘요.",
      "접종 후에는 평평하지 않은 잔디·흙길에서 스스로 냄새 맡고 걷게 해요(Krontveit 연구진 권고: 부드럽고 적당히 울퉁불퉁한 땅).",
      "실내 장애물 놀이는 높이 없이, 의자 사이 지그재그 정도로 해요.",
    ],
    avoid: [
      "높은 곳에서 뛰어내리기, 오래 공 쫓아 달리기 반복.",
      "미끄러운 바닥에서 신나게 뛰게 두기(미끄럼 방지 매트 근거는 미확인).",
    ],
    ask: "\"다리를 들고 걷거나 뒷다리를 깡충거리며 걸어요. 슬개골을 봐 주시겠어요?\" (소형견 슬개골 탈구와 운동의 관계는 미확인)",
    sources: [
      {"name":"Krontveit RI 등, AJVR 2012(PMID 22620698)","url":"https://pubmed.ncbi.nlm.nih.gov/22620698/"},
      {"name":"AKC 두뇌 게임(실내 장애물)","url":"https://www.akc.org/expert-advice/health/fun-cognitive-training-games-for-dogs/"},
    ],
  },
  { // 3-4-1
    id: "s3-vaccine-1", stage: 3, area: "vaccine",
    title: "접종 마무리는 '16주 이상'에, 광견병과 등록도 같이 챙겨요",
    why: [
      "엄마에게 받은 항체가 백신을 막을 수 있어서, WSAVA는 회차 수보다 마지막 회차를 16주령 이상에 맞추는 걸 중요하게 봐요.",
      "국내 병원의 \"5차 접종\"은 시작 시기·간격이 WSAVA와 다를 수 있어요.",
    ],
    how: [
      "접종 수첩에서 지금까지 몇 번 맞았는지 확인하고, 마지막 회차 날짜가 16주령 이상인지 병원에 물어요(WSAVA).",
      "광견병: 지자체 안내는 3개월령 이상, 매년이에요.",
      "동물등록: 2개월령 이상 개는 갖게 된 날(또는 2개월령이 된 날)부터 30일 안에 등록해요. 농식품부는 내장형을 권해요.",
      "26주령(약 6개월)쯤 추가 접종이 있는지 일정을 미리 잡아요(WSAVA 2017 발표문).",
      "켄넬코프·인플루엔자는 호텔·유치원·미용처럼 단체생활이 있으면 상의해요(WSAVA: 비핵심).",
    ],
    avoid: [
      "집에서 직접 주사하기(자가 접종 부작용 사례, 데일리벳).",
      "\"몇 차까지가 필수\"라고 단정하기. 생활환경에 따라 병원이 정해요(WSAVA).",
    ],
    ask: "\"마지막 종합백신이 16주령 이후였나요? 항체 검사가 필요할까요?\" \"우리 아이 생활(미용·호텔)에 켄넬코프가 필요할까요?\"",
    sources: [
      {"name":"WSAVA 접종 지침(Day MJ, 2017)","url":"https://www.vin.com/doc/?id=8506324"},
      {"name":"광견병 지자체 안내","url":"https://www.yeonsu.go.kr/main/part/economy/animal_vaccination.asp"},
      {"name":"농식품부 동물등록 보도자료(2026-09-13)","url":"https://www.mafra.go.kr/bbs/home/792/579241/artclView.do"},
    ],
  },
  { // 3-4-2
    id: "s3-parasite-1", stage: 3, area: "parasite",
    title: "장내 구충은 6개월까지 매달, 심장사상충은 1년 내내",
    why: [
      "퍼피는 엄마나 흙·변에서 장내 기생충이 옮기 쉬워요.",
      "CAPC는 2~6개월에 매달 구충을 권해요.",
      "심장사상충은 모기로 옮고, 한국에도 있어요(대구 반려견 7.7% 양성, 실외견 23%).",
    ],
    how: [
      "장내 구충: 2~6개월은 매달(CAPC).",
      "심장사상충 예방약: 늦어도 8주부터, 1년 내내 매달(AHS, CAPC).",
      "첫해 변 검사는 최소 4번이에요(CAPC). 접종 날 변을 챙겨 가요.",
      "체중이 늘면 약 용량이 바뀔 수 있어요. 처방받을 때마다 체중을 재요(AHS).",
      "산책을 시작했다면 산책 뒤 귀·목줄 아래·겨드랑이·발가락 사이를 손으로 훑어 진드기를 봐요(국내 SFTS 기사).",
    ],
    avoid: [
      "\"겨울엔 안 먹여도 된다\"고 혼자 정하기. AHS·CAPC는 1년 내내를 권해요.",
      "큰 개 약을 나눠 먹이기.",
      "배변을 맨손으로 만지기. 사람에게 옮는 기생충도 있어요(CAPC).",
    ],
    ask: "\"심장사상충·장내·외부 기생충을 한 번에 막는 방법이 우리 아이에게 맞나요?\" \"다음 변 검사는 언제 할까요?\"",
    sources: [
      {"name":"CAPC 일반 지침","url":"https://capcvet.org/guidelines/general-guidelines/"},
      {"name":"미국 심장사상충학회(AHS)","url":"https://www.heartwormsociety.org/pet-owner-resources/heartworm-basics"},
      {"name":"국내 양성률(데일리벳, 2023-06)","url":"https://www.dailyvet.co.kr/?p=186717"},
    ],
  },
  { // 3-4-3
    id: "s3-teeth-1", stage: 3, area: "teeth",
    title: "이가 두 줄로 보이면 기다리지 말고 병원",
    why: [
      "유치 28개가 영구치 42개로 바뀌어요.",
      "유치가 안 빠지고 남는 잔존 유치는 소형견에 더 흔해요(VCA).",
      "남은 유치는 이 배열과 맞물림을 틀어지게 할 수 있어, 수의사가 일찍 빼는 게 대개 합병증을 막아요(Merck).",
    ],
    how: [
      "일주일에 한 번 입술을 살짝 들어 송곳니 자리를 봐요.",
      "같은 자리에 유치와 영구치가 나란히 보이면 사진을 찍어 병원에 보여 줘요(VCA).",
      "빠진 유치를 못 찾아도 괜찮아요. 삼키는 경우가 많대요(기관 근거 미확인).",
    ],
    avoid: [
      "\"중성화할 때 같이 빼자\"며 무작정 미루기. 옛날 방식이라는 병원 자료가 있어요.",
      "집에서 흔들어 빼기.",
    ],
    ask: "\"이 유치는 언제까지 기다려도 되나요? 지금 빼야 하나요?\" \"중성화 상담 때 유치 정리도 같이 볼 수 있나요?\"",
    sources: [
      {"name":"VCA 잔존 유치","url":"https://vcahospitals.com/know-your-pet/retained-deciduous-teeth-baby-teeth-in-dogs"},
      {"name":"Merck 보호자용 개 치아 질환","url":"https://www.merckvetmanual.com/dog-owners/digestive-disorders-of-dogs/dental-disorders-of-dogs"},
      {"name":"잔존 유치 발치 시기(동물병원)","url":"https://www.kingsdale.com/retained-puppy-teeth-how-long-should-you-wait"},
    ],
  },
  { // 3-4-4
    id: "s3-neuter-1", stage: 3, area: "neuter",
    title: "4~5개월, 중성화는 '결정' 말고 '상담'부터",
    why: [
      "AAHA 2019 지침은 소형견(예상 성견 체중 약 20kg 미만) 암컷은 첫 발정 전(5~6개월), 수컷은 6개월을 제안 시기로 적었어요.",
      "그 전에 한 번 이야기해 둬야 준비할 수 있어요.",
      "정답 나이는 없고, 견종·체중·성별에 따라 달라요.",
    ],
    how: [
      "퍼피 접종이 끝나 갈 무렵(4~5개월) 상담을 잡아요.",
      "예상 성견 체중을 물어봐요. AAHA 기준선이 20kg이에요.",
      "암컷이면 \"첫 발정 전이냐 후냐\"를 같이 정해요. 첫 발정 전 수술은 유선암 가능성 0.5% 미만, 첫 발정 한 번 뒤 8%, 두 번 뒤 26%로 보고됐어요(VCA, AAHA).",
      "수술 전 혈액검사·마취·회복(대부분 5~10일 뒤 평소 활동)과 넥카라 기간을 물어요(VCA).",
      "예상 비용을 미리 물어요. 전신마취 수술은 예상 진료비를 미리 알려야 하는 대상이에요(수의사법, 데일리벳 보도).",
    ],
    avoid: [
      "\"한 번 낳게 하면 차분해진다\", \"성격이 바뀐다\"는 말 믿기. VCA는 둘 다 아니라고 해요.",
      "안 하기로 한 보호자를 탓하기. 할지 말지는 보호자와 수의사가 함께 정해요(AAHA, Hart 연구 취지).",
    ],
    ask: "\"우리 아이 예상 성견 체중이면 몇 개월쯤이 좋을까요?\" (수컷) \"고환이 둘 다 내려왔나요?\" (잠복고환 기관 자료는 미확인)",
    sources: [
      {"name":"AAHA 2019 중성화 제안 시기","url":"https://www.aaha.org/aaha-guidelines/life-stage-canine-2019/spay-and-neuter-timing/"},
      {"name":"AAHA 「Concepts to Consider」(8%·26%)","url":"https://www.aaha.org/aaha-guidelines/life-stage-canine-2019/spay-and-neuter-timing/concepts-to-consider/"},
      {"name":"VCA 「Spaying in Dogs」","url":"https://vcahospitals.com/know-your-pet/spaying-in-dogs"},
    ],
  },
  { // 3-5-1
    id: "s3-behavior-1", stage: 3, area: "behavior",
    title: "입질은 \"아야 → 안 통하면 잠깐 멈추기\"",
    why: [
      "퍼피 입질은 대부분 정상이에요.",
      "강아지는 놀다가 너무 세게 물면 놀이가 멈추는 경험으로 무는 힘 조절을 배워요(ASPCA).",
      "이갈이(3.5~6개월)와 겹쳐 가장 심해지는 때예요.",
    ],
    how: [
      "세게 물면 짧게 \"아야!\" 하고 손에 힘을 빼요. 멈추거나 핥으면 칭찬하고 다시 놀아요(ASPCA).",
      "15분에 3번 넘게 반복하지 않아요. 소리가 안 통하면 10~20초 무시, 또 물면 일어나 10~20초 자리를 떠요(ASPCA).",
      "손 대신 터그 장난감·씹을 것을 바로 건네요. 터그 장난감은 손 닿는 곳에 둬요(ASPCA).",
      "쓰다듬을 때 흥분해서 물면, 다른 손으로 작은 간식을 주며 만져요(ASPCA).",
      "소리에 더 흥분하는 아이는 소리 없이 바로 멈추기만 해요(Dogs Trust).",
    ],
    avoid: [
      "손발을 얼굴 앞에서 흔들며 놀기, 물 때 손을 확 빼기(달려들게 만들어요)(ASPCA).",
      "코 때리기, 목덜미 흔들기, 입에 손가락 넣기. 더 세게 물거나 겁먹고 공격성이 생길 수 있어요(ASPCA).",
      "놀이 자체를 막기. 놀이는 유대에 중요해요(ASPCA).",
    ],
    ask: "놀 때와 달리 몸과 얼굴이 굳은 채 물거나, 만지거나 붙잡을 때만 문다면 수의사나 행동 전문가에게 상담해요(ASPCA). \"통증 때문일 수 있나요?\"",
    sources: [
      {"name":"ASPCA 「Mouthing, Nipping and Biting in Puppies」","url":"https://www.aspca.org/pet-care/dog-care/common-dog-behavior-issues/mouthing-nipping-and-biting-puppies"},
      {"name":"Dogs Trust","url":"https://www.dogstrust.org.uk/dog-advice/unwanted-behaviours/stop-your-dog-chewing-mouthing"},
    ],
  },
  { // 3-5-2
    id: "s3-training-1", stage: 3, area: "training",
    title: "하루 5분: 이름 → 앉아 → 풀어 주는 말 → 기다려 → 이리 와",
    why: [
      "AKC는 한 번에 5~10분만 하고 늘 성공으로 끝내라고 해요.",
      "지금 쌓은 기본기가 사춘기(시기 4)에 흔들릴 때 돌아갈 자리가 돼요.",
    ],
    how: [
      "이름 → 눈 맞춤: 조용한 곳에서 이름을 한 번 부르고 쳐다보면 보상(UC Davis, AKC).",
      "앉아: 간식을 코앞에서 천천히 머리 위로 → 엉덩이가 닿으면 보상 → 빈손 손짓 → 말 붙이기(AKC).",
      "풀어 주는 말(\"좋아\"): 움직이는 순간 그 말을 하며 간식을 바닥에 던져요(AKC).",
      "기다려: 시간 먼저, 거리는 나중에. 일어나면 혼내지 말고 더 짧게(AKC).",
      "이리 와: 집 안에서 간식을 던지고 멀어지며 불러요. 오면 크게 보상, \"오는 건 즐거운 일\"(AKC). 보상은 사료 알갱이도 돼요. 하루 급여량에서 빼요(AKC).",
    ],
    avoid: [
      "엉덩이를 눌러 앉히기, 리드줄 홱 당기기, 소리치기(AKC).",
      "이름을 여러 번 반복하기. 무시하는 게 쉬워져요(AKC).",
      "온 강아지를 혼내기, 목욕·발톱 깎기 직전에 \"이리 와\" 쓰기(UC Davis).",
    ],
    ask: "\"앉을 때 뒷다리를 한쪽으로 빼고 앉는데 괜찮을까요?\" (몸 이상 확인용 질문 예시)",
    sources: [
      {"name":"AKC 「Teach Your Puppy These 5 Basic Cues」","url":"https://www.akc.org/expert-advice/training/teach-your-puppy-these-5-basic-commands/"},
      {"name":"UC Davis 「Recall Training in Dogs」","url":"https://www.vetmed.ucdavis.edu/sites/g/files/dgvnsk491/files/inline-files/Recall_Training_in_Dogs.pdf"},
      {"name":"AVSAB 보상 기반 훈련 성명 2021","url":"https://avsab.org/wp-content/uploads/2024/12/AVSAB-Humane-Dog-Training-Position-Statement-2021.pdf"},
    ],
  },
  { // 3-5-3
    id: "s3-social-1", stage: 3, area: "social",
    title: "3개월이 지나도 사회화는 계속, '좋은 경험'으로만",
    why: [
      "AVSAB는 생후 첫 3개월을 가장 중요한 사회화 시기로 봐요. 3개월이 지났다고 늦은 건 아니에요.",
      "같은 원칙으로 천천히 이어 가요(3개월 이후 효과 수치는 미확인). 3살 미만 개가 죽는 가장 큰 원인이 행동 문제라는 게 AVSAB의 설명이에요.",
    ],
    how: [
      "매주 새 경험 몇 가지: 모자·우산 쓴 사람, 엘리베이터, 초인종·청소기 소리(아주 작게 틀고 간식)(보호소·퍼듀대 자료).",
      "아파트라면 초인종·현관 소리 연습을 일찍 해요.",
      "다른 개는 길에서 아무나보다 접종 끝난 건강한 아는 개와 약속 놀이(AKC).",
      "몸 만지기(귀·발·입)도 사회화예요. 짧게 만지고 간식(퍼듀대).",
    ],
    avoid: [
      "무서워하는데 붙잡아 두거나 억지로 안겨 주기.",
      "꼬리 말기, 피하기, 낑낑 같은 신호를 무시하기. 그 자리를 떠나요(휴메인 소사이어티).",
    ],
    ask: "\"병원에 오면 많이 떨어요. 진료 없이 간식만 먹고 가는 '놀러 오기'를 해도 될까요?\"",
    sources: [
      {"name":"AVSAB 퍼피 사회화 입장문(퍼듀대 소개)","url":"https://caninewelfare.centers.purdue.edu/resource/avsab-puppy-socialization-position-statement"},
      {"name":"퍼듀대 사회화 안내","url":"https://caninewelfare.centers.purdue.edu/wp-content/uploads/2021/10/02-9-28-21-Handout01_Quick-Tips-for-Success-Puppy-Socialization-and-Early-Exposure_F....pdf"},
      {"name":"AKC 다른 개와 인사","url":"https://www.akc.org/expert-advice/training/dog-to-dog-greetings/"},
    ],
  },
  { // 3-5-4
    id: "s3-alone-1", stage: 3, area: "alone",
    title: "배변·혼자 있기: '개월 수 + 1시간'을 넘기지 않게",
    why: [
      "소변을 참는 시간은 대략 개월 수 + 1시간이에요(3개월 ≈ 4시간, AKC).",
      "SF SPCA는 크레이트 기준 13~16주 최대 3시간, 4개월 이상도 밤 말고는 3~4시간을 넘기지 말라고 해요.",
      "국내 보호자는 하루 평균 5시간 54분 반려동물을 혼자 둬요(KB 2025).",
    ],
    how: [
      "배변 장소(패드든 바깥이든)는 같은 자리, 같은 신호어로 정해요(SF SPCA, AKC).",
      "혼자 있기 연습: 다른 방 몇 초 → 현관 밖 1분 → 5분 → 30분, 몇 주에 걸쳐(ASPCA).",
      "나갈 때 20~30분 걸리는 음식 장난감을 줘요(ASPCA).",
      "나갈 때·올 때 인사는 짧고 조용하게, 돌아오면 진정된 뒤 반겨요(ASPCA).",
      "출근이 길면 중간에 누가 들르게 해요(SF SPCA 시간표 기준).",
    ],
    avoid: [
      "실수한 걸 나중에 보고 혼내기. 연결하지 못해요(ASPCA).",
      "패드 위치를 자주 바꾸기.",
    ],
    ask: "\"배변 실수가 갑자기 늘었어요. 방광염 같은 원인부터 볼까요?\" (ASPCA: 의학적 원인 먼저)",
    sources: [
      {"name":"AKC 배변 훈련 타임라인","url":"https://www.akc.org/learn/akc-training/puppy-potty-training-timeline/"},
      {"name":"SF SPCA 퍼피 배변 훈련","url":"https://www.sfspca.org/wp-content/uploads/2023/02/dog_behavior_house-training_puppy.pdf"},
      {"name":"SF SPCA 크레이트 훈련","url":"https://www.sfspca.org/wp-content/uploads/2023/02/dog_commands_crate-training-puppy.pdf"},
    ],
  },
  { // 3-6-1
    id: "s3-teeth-2", stage: 3, area: "teeth",
    title: "이갈이 중 양치는 '습관 들이기'만",
    why: [
      "잇몸병은 개가 이를 잃는 가장 큰 이유이고, 소형견에 더 많아요(Merck).",
      "영구치가 나는 지금 양치에 익숙해지면 평생이 편해요.",
      "이갈이 땐 잇몸이 예민해 부드럽게 해요(VCA).",
    ],
    how: [
      "1~3일: 손가락에 반려동물용 치약을 조금, 냄새 맡고 핥게 → 칭찬·간식(SF SPCA, CSU).",
      "4~6일: 입술을 살짝 들고 손가락으로 앞니·송곳니 잇몸을 문질러요.",
      "7~9일: 손가락 칫솔이나 거즈로 바깥 면 몇 개.",
      "10일~: 작은 칫솔, 잇몸 쪽 45도, 가볍게 앞뒤로. 바깥 면만 닦아도 돼요(CSU, Merck).",
      "이갈이 중엔 1~3단계(손가락·거즈)에 머물러도 괜찮아요(기관 근거 미확인).",
    ],
    avoid: [
      "사람 치약. 자일리톨이 들어 있을 수 있어요(Merck, SF SPCA).",
      "싫어하는데 붙잡고 끝까지 하기. 한 단계 전으로 돌아가요.",
      "칫솔모가 눌려 납작해질 만큼 세게(SF SPCA).",
    ],
    ask: "\"이갈이 중인데 칫솔을 써도 될까요? 잇몸에 피가 조금 나요.\"",
    sources: [
      {"name":"Merck 보호자용 개 치아 질환","url":"https://www.merckvetmanual.com/dog-owners/digestive-disorders-of-dogs/dental-disorders-of-dogs"},
      {"name":"콜로라도주립대 수의병원 양치법","url":"https://csuveterinaryhealth.org/how-to-brush-your-dogs-teeth/"},
      {"name":"SF SPCA 양치법","url":"https://www.sfspca.org/blog/how-to-brush-your-dogs-teeth/"},
    ],
  },
  { // 3-6-2
    id: "s3-nails-1", stage: 3, area: "nails",
    title: "발 만지기 → 발톱깎이 소리 → 한두 개만",
    why: [
      "퍼피 발톱은 짧게 자주 다듬어요(동물병원 안내문).",
      "발 만지기를 싫어하게 되면 평생 발톱 깎기가 전쟁이 돼요.",
      "만지기 연습은 짧고 즐겁게, 간식과 함께 해요(VCA, 퍼듀대).",
    ],
    how: [
      "다리 쓰다듬기 → 간식(AKC).",
      "발을 잠깐 쥐었다 놓기 → 간식.",
      "발톱깎이를 발에 대고 소리만 들려주기, 자르지 않아요(AKC).",
      "하루에 한두 개만 끝을 조금. 하루에 다 못 해도 돼요(AKC).",
      "만질 때만 간식, 멈추면 간식도 끝(퍼듀대). 서 있을 때 발톱이 바닥에 닿거나 딱딱 소리가 나면 길어요.",
    ],
    avoid: [
      "몸이 굳거나 간식을 안 먹는데 계속하기. 스트레스 신호예요(VCA).",
      "검은 발톱을 한 번에 많이 자르기. 혈관이 안 보여요.",
    ],
    ask: "\"발톱 혈관 위치를 한 번 보여 주실 수 있나요?\" 피가 10분 넘게 멈추지 않으면 연락해요.",
    sources: [
      {"name":"AKC 발톱 깎기","url":"https://www.akc.org/expert-advice/health/how-to-trim-dogs-nails-safely/"},
      {"name":"VCA 만지기·밥그릇 연습","url":"https://vcahospitals.com/bond/know-your-pet/puppy-behavior-and-training---handling-and-food-bowl-exercises"},
      {"name":"퍼듀대 퍼피 몸 만지기","url":"https://caninewelfare.centers.purdue.edu/resource/quick-tips-for-success-puppy-body-handling-croney-research-group"},
    ],
  },
  { // 3-6-3
    id: "s3-bath-1", stage: 3, area: "bath",
    title: "목욕은 가끔, 빗질은 짧고 자주, 귀는 '살짝'",
    why: [
      "너무 자주 씻기면 피부 기름이 빠져 건조해질 수 있어요(수의사 인용 기사).",
      "엉킴을 막는 건 목욕보다 빗질이에요.",
      "귓길은 L자라 물이 고이면 염증이 생길 수 있어요(AKC).",
    ],
    how: [
      "목욕: 한 달에 한 번쯤(AKC 기사 속 그루머, 출처마다 다름). 미지근한 물, 강아지용 샴푸. \"다 헹궜다 싶으면 한 번 더\"(AKC).",
      "얼굴 씻을 땐 귀 입구를 살짝 접어 막아요(AKC). 드라이어는 약한 바람으로 움직이며, 속털까지 완전히 말려요(AKC).",
      "겨울엔 욕실을 미리 데우고 빨리 말려요.",
      "빗질: 부드러운 슬리커로 등·옆구리 몇 번 → 간식, 처음엔 1~2분. 귀 뒤가 잘 엉켜요.",
      "귀·눈: 귀는 강아지용 세정제로 보이는 곳만. 눈물 자국은 미지근한 물이나 식염수 솜으로 닦고 말려요(동물병원 안내문).",
    ],
    avoid: [
      "사람 샴푸(AKC).",
      "면봉을 귓속에 넣기. 귀지를 더 깊이 밀어 넣어요(코넬 Riney 센터 인용).",
      "털 많은 이중모를 바짝 밀기. 다시 자라는 데 12~24개월 걸리는 클리핑 후 탈모가 생길 수 있어요(미네소타대 수의피부과 교재).",
      "드라이어를 한곳에 오래 대기.",
    ],
    ask: "\"목욕 뒤 귀를 계속 긁고 냄새가 나요. 귀 염증일까요?\" \"노란·초록 눈곱이 나와요.\" (바로 진료 신호)",
    sources: [
      {"name":"AKC 퍼피 목욕","url":"https://www.akc.org/expert-advice/health/bathing-puppy-bath-shampoo-care/"},
      {"name":"미네소타대 수의피부과 교재(클리핑 후 탈모)","url":"https://open.lib.umn.edu/animaldermatology2/chapter/canine-post-clipping-alopecia/"},
      {"name":"목욕 주기(수의사 인용 기사)","url":"https://businessinsider.in/insider-picks/news/how-often-you-should-bathe-your-dog-and-signs-youre-overdoing-it-according-to-veterinarians/articleshow/93622098.cms"},
    ],
  },
  { // 4-1-1
    id: "s4-food-1", stage: 4, area: "food",
    title: "하루 2번으로, 중성화 뒤엔 양을 다시 봐요",
    why: [
      "AKC는 6~12개월에 하루 2번으로 줄이라고 해요. 빠른 성장이 멈추는 때라(AAHA: 약 6~9개월) 퍼피 때 양을 그대로 주면 살이 붙기 쉬워요.",
      "중성화 뒤엔 대사가 줄어요. 비만은 과식과 운동 부족 때문이라 양을 다시 맞춰요(VCA).",
    ],
    how: [
      "하루 양을 2번으로 나눠요. 약 12시간 간격(AKC, VCA).",
      "체중은 계속 매주, 체형(BCS 4~5)은 2주마다 손으로 봐요(AKC, WSAVA).",
      "중성화 뒤 2~4주는 체중 변화를 더 꼼꼼히 봐요.",
      "갈비뼈가 안 만져지면 조금 줄이고, 뼈가 도드라지면 조금 늘려요.",
    ],
    avoid: [
      "\"통통해야 귀엽다\"는 기준. 25% 적게 먹은 래브라도가 수명 중앙값이 길고 만성 질환이 늦었다는 연구가 있어요(Kealy 2002).",
      "사람 기준으로 \"조금 늘었네\" 넘기기. 3kg 아이의 300g은 몸무게의 10%예요(계산).",
    ],
    ask: "\"중성화 후 하루 열량을 얼마나 줄이면 될까요?\"",
    sources: [
      {"name":"AKC 퍼피 급여 기본(6~12개월 하루 2번)","url":"https://www.akc.org/expert-advice/health/puppy-feeding-fundamentals/"},
      {"name":"AAHA 2019 생애 단계 정의","url":"https://www.aaha.org/resources/life-stage-canine-2019/canine-life-stage-definitions/"},
      {"name":"VCA 「Spaying in Dogs」(대사·비만)","url":"https://vcahospitals.com/know-your-pet/spaying-in-dogs"},
    ],
  },
  { // 4-1-2
    id: "s4-food-2", stage: 4, area: "food",
    title: "성견 사료는 '다 자랐을 때', 조금 늦어도 괜찮아요",
    why: [
      "AKC는 소형견은 7~9개월, 대형견은 12~14개월에 성견 사료로 바꿀 수 있다고 하고, \"조금 늦게 바꾸는 편이 낫다\"고 해요.",
      "대형·초대형견은 성견 체중까지 최대 2년이 걸려 그만큼 퍼피 사료를 먹을 수 있어요(VCA).",
    ],
    how: [
      "우리 아이의 예상 성견 체중을 병원에 물어요.",
      "체중 그래프가 몇 주째 평평해지면 바꿀 때인지 상담해요.",
      "바꿀 땐 최소 7일: 1~2일 새 사료 25% → 3~4일 50% → 5~6일 75% → 7일 100%(AAHA 25% 시작, 여러 자료 공통).",
      "변이 무르면 이전 비율로 돌아가 며칠 더 머물러요(사료 회사 보호자 자료).",
      "양은 새 사료 포장의 급여표 기준으로 다시 계산해요(사료마다 열량이 달라요).",
    ],
    avoid: [
      "하루 만에 확 바꾸기.",
      "'전 연령'·'성장기' 표시를 안 보고 고르기. '완전'한 사료인지 라벨을 봐요(WSAVA).",
    ],
    ask: "\"체중이 거의 멈췄는데 성견 사료로 바꿔도 될까요?\"",
    sources: [
      {"name":"AKC 퍼피 급여 기본","url":"https://www.akc.org/expert-advice/health/puppy-feeding-fundamentals/"},
      {"name":"VCA 대형견 퍼피 영양(최대 2년)","url":"https://vcahospitals.com/know-your-pet/nutritional-requirements-of-large-and-giant-breed-puppies"},
      {"name":"WSAVA 사료 고르기 지침","url":"https://wsava.org/wp-content/uploads/2021/04/Selecting-a-pet-food-for-your-pet-updated-2021_WSAVA-Global-Nutrition-Toolkit.pdf"},
    ],
  },
  { // 4-1-3
    id: "s4-food-3", stage: 4, area: "food",
    title: "(대형견) 칼슘은 더하지 말고, 천천히 키워요",
    why: [
      "퍼피는 장에서 흡수하는 칼슘 양을 잘 조절하지 못해, 필요보다 많이 먹으면 그만큼 흡수해요.",
      "남는 칼슘은 뼈 기형을 일으킬 수 있어요(VCA).",
      "너무 빨리 자라는 것도 뼈와 관절에 부담이에요(VCA).",
    ],
    how: [
      "대형·초대형견은 대형견 성장기용으로 표시된 완전사료를 줘요(VCA 계열 안내).",
      "급여표와 체형으로 양을 맞추고, \"빨리 크게\"를 목표로 삼지 않아요(VCA).",
      "간식은 하루 열량 10% 미만(VCA, WSAVA).",
    ],
    avoid: [
      "칼슘제·뼈 영양제를 따로 먹이기. AKC는 대형견 퍼피라면 특히 보충제 전에 상의하라고 해요.",
      "성장기에 성견 사료나 퍼피용이 아닌 사료로 일찍 바꾸기(VCA).",
      "하루 종일 그릇에 사료 두기(VCA).",
    ],
    ask: "\"지금 사료의 칼슘 함량이 우리 아이에게 맞나요? 보충제가 필요한 상황인가요?\"",
    sources: [
      {"name":"VCA 대형견 퍼피 영양","url":"https://vcahospitals.com/know-your-pet/nutritional-requirements-of-large-and-giant-breed-puppies"},
      {"name":"AKC 퍼피 급여 기본(보충제 전 상의)","url":"https://www.akc.org/expert-advice/health/puppy-feeding-fundamentals/"},
      {"name":"VCA 대형견 영양 고려사항(성장식 최대 18~24개월)","url":"https://vcahospitals.com/know-your-pet/nutritional-considerations-for-large-and-giant-breed-dogs"},
    ],
  },
  { // 4-2-1
    id: "s4-toys-1", stage: 4, area: "toys",
    title: "남는 에너지는 머리로: 두뇌 게임과 숨바꼭질",
    why: [
      "사춘기엔 에너지가 넘치고 말을 덜 들을 수 있어요(Asher 2020).",
      "몸만 지치게 하기보다 머리를 쓰게 하면 좋아요.",
      "AKC는 머리 쓰는 운동이 몸 운동만큼 중요하다고 해요.",
    ],
    how: [
      "숨바꼭질: \"기다려\" 후 숨고 \"이리 와\"로 찾게, 찾으면 보상. 기본 훈련 복습이 돼요(AKC).",
      "그릇 겹치기·머핀 틀 퍼즐로 한 끼를 먹게 해요(AKC). 꼭 지켜볼 때만.",
      "산책 길 바꾸기: 새 장소에서 냄새 맡을 시간을 줘요(AKC).",
      "터그: 장난감만 물게 하고, 손을 물면 바로 멈춰요(ASPCA).",
    ],
    avoid: [
      "흥분한 채로 놀이를 길게 끌기. 놀이 뒤엔 쉬게 해요(AKC 하루 일과: 활동 뒤 낮잠).",
      "레슬링·손 장난(ASPCA).",
    ],
    ask: "놀이 중 갑자기 절뚝이면 산책·건강 카드 기준으로 상담해요.",
    sources: [
      {"name":"AKC 「Brain Games for Dogs」","url":"https://www.akc.org/expert-advice/health/fun-cognitive-training-games-for-dogs/"},
      {"name":"Asher 2020 Biology Letters","url":"https://pubmed.ncbi.nlm.nih.gov/32396785/"},
      {"name":"ASPCA 퍼피 입질","url":"https://www.aspca.org/pet-care/dog-care/common-dog-behavior-issues/mouthing-nipping-and-biting-puppies"},
    ],
  },
  { // 4-2-2
    id: "s4-toys-2", stage: 4, area: "toys",
    title: "영구치가 다 났으면 장난감 '한 단계' 올리기, 단 손톱 테스트는 그대로",
    why: [
      "대부분 6개월쯤 영구치가 다 나고(PetMD), 성견 이는 9개월쯤 완전히 자리 잡아요(AKC).",
      "AKC는 이때 조금 더 단단한 고무로 넘어가라고 해요.",
      "하지만 영구치도 너무 단단한 것에 부러질 수 있어요(AAHA).",
    ],
    how: [
      "물렁한 고무에서 조금 더 단단한 고무로 바꿔요(AKC).",
      "그래도 손톱 자국이 나고 살짝 휘는 것만 골라요(AAHA).",
      "씹는 스타일을 봐요: 얌전히 물고 다님 / 보통 / 몇 분 만에 부수는 파괴형. 파괴형은 한 사이즈 큰 것으로(AAHA).",
      "덴탈 껌을 고른다면 VOHC 승인 여부를 봐요(AAHA). 양치를 대신하진 않아요(CSU).",
    ],
    avoid: [
      "\"이제 다 컸으니\" 사슴뿔·뼈·단단한 나일론 주기(AAHA).",
      "부서진 장난감 계속 주기(AAHA).",
    ],
    ask: "\"이가 깨진 것 같아요. 그대로 둬도 되나요?\" (부러진 이는 진료 대상)",
    sources: [
      {"name":"AKC 이갈이 장난감(9개월, 단단한 고무로)","url":"https://www.akc.org/expert-advice/health/puppy-teething-pain-toy/"},
      {"name":"PetMD 「Puppy Teeth」(DAVDC)","url":"https://www.petmd.com/dog/care/puppy-teeth-everything-you-need-know"},
      {"name":"AAHA 「Don't Chew On This!」","url":"https://www.aaha.org/resources/dont-chew-on-this/"},
    ],
  },
  { // 4-3-1
    id: "s4-social-1", stage: 4, area: "social",
    title: "모든 개와 인사할 필요는 없어요",
    why: [
      "줄을 맨 채 모르는 개와 인사하면 다치거나 병이 옮을 수 있고, 나중에 다른 개에게 예민해질 수 있어요(AKC).",
      "대부분의 성견은 모르는 개와의 인사를 원하지 않는다고 해요(AKC).",
      "사춘기에 생긴 나쁜 경험은 오래 남을 수 있어요(AKC 공포기).",
    ],
    how: [
      "멀리 개가 보이면 거리부터: 길 건너기, 내 몸을 사이에 두기(AKC).",
      "지나가는 동안 이름 → 눈 맞춤 → 간식(\"나 봐\")(AKC, Battersea).",
      "인사하고 싶으면 상대 보호자에게 먼저 묻기 → 옆에서 둥글게 → 셋 세고 \"고마워요\" → 불러서 떠나고 간식(Battersea).",
      "모르는 개가 허락 없이 오면 막아도 돼요. \"훈련 중이에요\"(AKC).",
    ],
    avoid: [
      "짖거나 당길 때 혼내기. 다른 개 = 나쁜 일로 기억될 수 있어요(Battersea).",
      "으르렁을 혼내기. 그만하라는 신호예요(Battersea).",
      "정면으로 바로 다가가게 하기(Battersea).",
    ],
    ask: "다른 개에게 자주 달려들거나 으르렁거리면 행동 전문가 상담을 권해요(Battersea). \"통증이나 몸 문제가 원인일 수 있을까요?\"",
    sources: [
      {"name":"AKC 「Dog-to-Dog Greetings」","url":"https://www.akc.org/expert-advice/training/dog-to-dog-greetings/"},
      {"name":"Battersea 산책 중 다른 개 소개","url":"https://www.battersea.org.uk/pet-advice/dog-advice/how-introduce-your-dog-other-dogs-walks"},
    ],
  },
  { // 4-3-2
    id: "s4-behavior-1", stage: 4, area: "behavior",
    title: "갑자기 겁이 많아졌다면: 두 번째 공포기",
    why: [
      "AKC는 6~14개월에 두 번째 공포기가 올 수 있다고 해요.",
      "소형견은 대형견보다 일찍 오는 편이에요.",
      "이 시기의 나쁜 경험은 평생 성격에 영향을 줄 수 있어요(AKC).",
    ],
    how: [
      "무서워하는 것에서 스스로 물러나게 해요(AKC).",
      "얼마나 가까이 갈지는 강아지가 정하게 해요(AKC).",
      "짧게 하고, 간식과 칭찬으로 좋게 끝내요(AKC).",
      "이 기간엔 북적이는 곳·자극 많은 훈련 외출을 줄여요(AKC).",
    ],
    avoid: [
      "무서워하는 것에 억지로 다가가게 하기. 더 크고 오래가는 두려움이 될 수 있어요(AKC).",
      "겁먹은 아이를 혼내기(보상 기반 원칙과 같음).",
    ],
    ask: "\"겁이 몇 주째 줄지 않고 점점 심해져요. 행동 전문가 상담이 필요할까요?\"",
    sources: [
      {"name":"AKC 「Puppy Fear Periods」","url":"https://www.akc.org/expert-advice/training/puppy-fear-periods/"},
    ],
  },
  { // 4-3-3
    id: "s4-walk-1", stage: 4, area: "walk",
    title: "대형견 성장기 운동은 '강도'보다 '자유롭게'",
    why: [
      "대형견은 다 자라는 데 15~24개월이 걸려요(AKC).",
      "어릴 때 계단은 고관절 이형성 위험과, 목줄 없이 바깥에서 자유롭게 움직이는 운동은 낮은 위험과 연관됐어요(Krontveit 2012, 3개월까지 조사).",
      "성장판이 닫히는 정확한 월령과 운동량 기준은 이번에 확인하지 못했어요(미확인).",
    ],
    how: [
      "강아지가 스스로 속도를 정하는 산책·탐색 위주로 해요(Krontveit 연구 취지).",
      "산책 시간은 조금씩 늘리고, 주저앉거나 안아 달라 하거나 헐떡임이 심하면 멈춰요.",
      "소형견도 하네스를 계속 써요. 기관이 약한 아이가 많아요(동물병원 안내문).",
    ],
    avoid: [
      "다 자라기 전 자전거·달리기에 맞춰 오래 뛰게 하기(기관 기준 미확인).",
      "높은 곳 점프·점프 놀이 반복.",
    ],
    ask: "\"우리 아이는 언제쯤 성장이 끝나나요? 그 전에 피해야 할 운동이 있나요?\"",
    sources: [
      {"name":"AKC 퍼피 급여 기본(대형견 15~24개월 성숙)","url":"https://www.akc.org/expert-advice/health/puppy-feeding-fundamentals/"},
      {"name":"Krontveit 2012(PMID 22620698)","url":"https://pubmed.ncbi.nlm.nih.gov/22620698/"},
      {"name":"기관 허탈·하네스(동물병원 안내문)","url":"https://animalcarehospital.vet/sites/site-4271/documents/Tracheal%20collapse.pdf"},
    ],
  },
  { // 4-4-1
    id: "s4-neuter-1", stage: 4, area: "neuter",
    title: "(암컷) 첫 발정 미리 알아 두기",
    why: [
      "첫 발정은 보통 6개월 무렵이지만 6~24개월까지 다양하고, 작은 개가 더 이른 편이에요(코넬, VCA).",
      "중성화 시기 결정과 바로 연결돼요.",
    ],
    how: [
      "신호를 알아 둬요: 외음부가 붓고 피 섞인 분비물이 나와요(코넬).",
      "피가 비치는 기간은 보통 14~21일이에요(코넬). 앱에 시작일을 기록해요.",
      "이 기간엔 줄을 꼭 매고, 중성화하지 않은 수컷과 떨어뜨려요.",
      "대부분 1년에 2번, 평균 5~11개월 간격이에요(코넬).",
    ],
    avoid: [
      "발정 중에 바로 중성화 수술하기. 코넬은 출혈 위험 때문에 약 2개월 기다리기를 권해요(필요하면 가능).",
      "출혈을 단순 상처로 넘기기(발정인지 병원에서 확인).",
    ],
    ask: "\"첫 발정 전에 수술할까요, 지나고 할까요?\" \"발정이 끝났는데 물을 많이 마시고 기운이 없어요.\" (자궁 감염 같은 질환 신호일 수 있어요, AKC 물 자료·VCA)",
    sources: [
      {"name":"코넬 Riney 센터 「Dog Estrous Cycles」","url":"https://www.vet.cornell.edu/departments/riney-canine-health-center/canine-health-information/dog-estrous-cycles"},
      {"name":"VCA 「Spaying in Dogs」(자궁축농증 예방)","url":"https://vcahospitals.com/know-your-pet/spaying-in-dogs"},
      {"name":"VCA 발정 주기(약 6개월)","url":"https://www.vcahospitals.com/know-your-pet/estrus-cycles-in-dogs"},
    ],
  },
  { // 4-4-2
    id: "s4-neuter-2", stage: 4, area: "neuter",
    title: "중성화 결정: 체중 20kg이 갈림길",
    why: [
      "AAHA 2019 표에서 소형견은 수컷 6개월, 암컷 첫 발정 전(5~6개월)이 제안 시기예요.",
      "대형견은 성장이 멈출 때까지 기다림(수컷 약 9~15개월, 암컷 약 5~15개월)이에요.",
      "믹스견 연구에서 20kg 이상은 1살 전 중성화가 관절 질환 위험과 연관됐고, 20kg 미만은 그렇지 않았어요(Hart 2020).",
    ],
    how: [
      "예상 성견 체중을 기준으로 시기를 병원과 정해요(AAHA).",
      "소형견종 대부분은 시기에 따라 관절 위험이 늘지 않았어요. 견종별 차이는 있어요(Hart 2020, 35견종).",
      "26주령 추가 접종이나 유치 정리와 같은 날 할 수 있는지 물어요(WSAVA 2017).",
      "수술 뒤 5~10일 재진·넥카라 일정을 앱에 적어요(VCA).",
    ],
    avoid: [
      "\"몇 개월이 정답\"이라는 글만 보고 정하기. AAHA도 근거 대부분이 연관성이라 한 견종 결과를 모두에게 적용하기 어렵다고 해요.",
      "수술 뒤 상처 핥게 두기(VCA: 넥카라).",
    ],
    ask: "\"우리 아이 견종에서 시기에 따른 위험 차이가 알려진 게 있나요?\" \"예상 비용과 수술 전 검사 항목을 알려 주세요.\"",
    sources: [
      {"name":"AAHA 2019 중성화 제안 시기","url":"https://www.aaha.org/aaha-guidelines/life-stage-canine-2019/spay-and-neuter-timing/"},
      {"name":"Hart 2020 35견종","url":"https://doi.org/10.3389/fvets.2020.00388"},
      {"name":"Hart 2020 믹스견 체중군","url":"https://doi.org/10.3389/fvets.2020.00472"},
    ],
  },
  { // 4-4-3
    id: "s4-checkup-1", stage: 4, area: "checkup",
    title: "6개월 이후 예방 루틴: 추가 접종·연중 구충·심장사상충 검사",
    why: [
      "WSAVA는 26주령(약 6개월) 이후 추가 접종을 둬요.",
      "CAPC는 6개월 이후 1년 내내 예방 프로그램을 권해요.",
      "심장사상충은 감염 뒤 약 7개월이 지나야 검사에 나와요(AHS).",
    ],
    how: [
      "26주령 이후 추가 접종 날짜를 병원과 정해요(WSAVA).",
      "장내 구충은 연중 예방 프로그램(또는 분기마다)으로(CAPC).",
      "심장사상충 약은 매달 그대로, 검사는 매년(AHS). 예방을 쉬었던 7개월 이상 개는 검사 후 다시 시작해요(AHS).",
      "변 검사는 성견 기준 1년 2번 이상이에요(CAPC).",
      "광견병은 매년(지자체 안내). 이사·연락처 변경은 30일 안에 등록 정보 변경 신고(농식품부·서울시).",
    ],
    avoid: [
      "퍼피 접종이 끝났다고 예방도 끝났다고 생각하기.",
      "체중이 바뀌었는데 약 용량을 그대로 두기(AHS).",
    ],
    ask: "\"다음 심장사상충 검사는 언제 하면 될까요?\" \"1년 접종 계획표를 한 장으로 받을 수 있을까요?\"",
    sources: [
      {"name":"WSAVA 접종 지침(2017 발표문)","url":"https://www.vin.com/doc/?id=8506324"},
      {"name":"CAPC 일반 지침","url":"https://capcvet.org/guidelines/general-guidelines/"},
      {"name":"AHS 심장사상충 기본","url":"https://www.heartwormsociety.org/pet-owner-resources/heartworm-basics"},
    ],
  },
  { // 4-4-4
    id: "s4-checkup-2", stage: 4, area: "checkup",
    title: "한 달에 한 번 '코끝부터 꼬리까지', 평소 값 적어 두기",
    why: [
      "VCA는 집에서 한 달에 한 번 몸을 살펴보길 권해요.",
      "젊고 건강할 때 재 둔 평소 값이 나중에 이상을 알아채는 기준이 돼요.",
      "6~7개월이 지나도 유치가 남아 있으면 진료 대상이에요(Merck, VCA).",
    ],
    how: [
      "편안할 때(낮잠 직전), 눈 → 코 → 귀 → 입 → 목 → 몸통·다리 → 배 → 등 → 발 순서로 쓰다듬듯 봐요(VCA).",
      "잘 때 호흡수를 15초 세고 ×4. 건강한 성견 평균은 약 13회/분이에요(Rishniw 2012).",
      "입 안: 남은 유치, 부러진 이, 잇몸 색(분홍)을 봐요(VCA, Merck).",
      "정상일 때 3번쯤 재서 앱에 적어 둬요.",
    ],
    avoid: [
      "집 체크로 병원 검진을 대신하기(VCA).",
      "체온을 억지로 재기. 처음엔 병원에서 한 번 배워요.",
    ],
    ask: "잘 때 호흡수가 30을 넘는 일이 반복되거나 35를 넘으면 바로 연락해요(코넬, VCA). \"아직 유치가 남아 있는데 지금 빼야 할까요?\"",
    sources: [
      {"name":"VCA 「Giving Your Dog a Thorough Home Check-up」","url":"https://vcahospitals.com/know-your-pet/giving-your-dog-a-thorough-home-check-up"},
      {"name":"코넬 Riney 센터(호흡수 35)","url":"https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-information/get-jump-heart-murmurs"},
      {"name":"Rishniw 2012","url":"https://pubmed.ncbi.nlm.nih.gov/22240295/"},
    ],
  },
  { // 4-5-1
    id: "s4-training-1", stage: 4, area: "training",
    title: "갑자기 말을 안 들어도 실패가 아니에요 (사춘기)",
    why: [
      "안내견 후보견 연구에서 8개월에는 보호자의 '앉아'에 거듭 반응하지 않을 가능성이 5개월 때보다 높았어요. 12개월엔 다시 나아졌어요(Asher 2020).",
      "연구진은 보호자와의 관계가 흔들리기 쉬운 때라고 했어요. 대형견 연구라 소형견의 사춘기 시기는 미확인이에요.",
    ],
    how: [
      "기본 훈련을 짧게라도 계속해요. 5~10분, 성공으로 끝내기(AKC).",
      "안 되면 쉬운 단계로 돌아가요. 산만한 곳 → 조용한 곳(AKC, UC Davis).",
      "보상을 더 좋은 것으로 바꾸거나 속도를 늦춰요(AKC: \"고집이 세다\" 싶을 때).",
      "\"말을 안 듣는 시기가 올 수 있어요. 지나가는 시기예요.\"",
    ],
    avoid: [
      "\"서열을 잡아야 한다\", \"엄하게 혼내야 고친다\". AKC·ASPCA·AVSAB 모두 보상 기반을 권해요.",
      "신호를 여러 번 반복하기(AKC).",
    ],
    ask: "행동이 갑자기 바뀌었다면 통증 같은 건강 문제일 수 있어 병원부터 가요(AAHA). \"어디 아파서 그럴 수 있을까요?\"",
    sources: [
      {"name":"Asher L 등 「Teenage dogs?」 Biology Letters 2020","url":"https://pubmed.ncbi.nlm.nih.gov/32396785/"},
      {"name":"AKC 기본 신호 5가지","url":"https://www.akc.org/expert-advice/training/teach-your-puppy-these-5-basic-commands/"},
      {"name":"AVSAB 보상 기반 훈련 성명","url":"https://avsab.org/wp-content/uploads/2024/12/AVSAB-Humane-Dog-Training-Position-Statement-2021.pdf"},
    ],
  },
  { // 4-5-2
    id: "s4-training-2", stage: 4, area: "training",
    title: "'이리 와'가 흔들릴 때: 긴 줄과 절대 혼내지 않기",
    why: [
      "사춘기엔 바깥 냄새와 다른 개가 보호자보다 재미있어져요.",
      "'이리 와'는 위험할 때 아이를 지키는 신호라 다시 다져야 해요.",
      "UC Davis는 온 개를 절대 혼내지 말라고 강조해요.",
    ],
    how: [
      "실내에서 다시 시작 → 안전한 울타리 안 → 긴 줄을 단 바깥 순서로(AKC).",
      "\"이름 + 이리 와\"를 한 번만, 밝게. 몸을 낮추고 불러요(UC Davis).",
      "오기 시작하는 순간부터 보상하고, 오면 크게 칭찬·간식·놀이(UC Davis, AKC).",
      "바로 안 오면 혼내지도 간식을 주지도 말고 조용히 가서 데려와요(UC Davis).",
    ],
    avoid: [
      "늦게 왔다고 혼내기(UC Davis).",
      "부르자마자 줄 채우고 집에 가기. 벌처럼 느낄 수 있어요(UC Davis).",
      "길가 같은 위험한 곳에서 줄 풀기. 어떤 훈련도 100%가 아니에요(UC Davis). 국내는 줄 2m 이하가 법이에요.",
    ],
    ask: "\"훈련 전에 귀가 잘 들리는지, 아픈 데는 없는지 봐 주세요.\" (UC Davis: 훈련 전 건강 확인)",
    sources: [
      {"name":"UC Davis 「Recall Training in Dogs」","url":"https://www.vetmed.ucdavis.edu/sites/g/files/dgvnsk491/files/inline-files/Recall_Training_in_Dogs.pdf"},
      {"name":"AKC 기본 신호 5가지","url":"https://www.akc.org/expert-advice/training/teach-your-puppy-these-5-basic-commands/"},
      {"name":"동물보호법 시행규칙(2m)","url":"https://www.law.go.kr/법령/동물보호법시행규칙"},
    ],
  },
  { // 4-5-3
    id: "s4-alone-1", stage: 4, area: "alone",
    title: "혼자 있을 때 짖고 뜯는다면: 분리 관련 행동 점검",
    why: [
      "Asher 2020 연구에서 분리 관련 행동 점수는 8개월에 5개월·12개월보다 36% 높았어요.",
      "혼자 남은 지 몇 분 안에 짖기·씹기·탈출 시도가 있으면 분리불안 신호일 수 있어요(ASPCA).",
      "아파트에선 이웃 소음 걱정도 커요.",
    ],
    how: [
      "나가기 전에 산책·노즈워크로 몸과 머리를 쓰게 해요(ASPCA, AKC).",
      "나갈 때 음식 넣은 장난감, 인사는 짧게(ASPCA).",
      "창밖 자극이 짖음 원인이면 블라인드를 내리고, 익숙한 라디오·TV 소리를 틀어요(AKC).",
      "짧은 외출 연습을 다시 섞어요(ASPCA, SF SPCA).",
      "짖음은 원인부터: 겁·영역·반가움·관심 요구·심심함. 관심 요구 짖음엔 반응하지 않고, 조용해지면 원하는 걸 줘요(AKC).",
    ],
    avoid: [
      "돌아와서 망가진 물건을 보여 주며 혼내기(ASPCA).",
      "소리치기. 짖음을 키울 수 있어요(AKC).",
      "씹기를 막으려고 6시간 넘게 크레이트에 두기, 입마개 씌우기(ASPCA).",
    ],
    ask: "\"혼자 있을 때만 심해요. 의학적 원인부터 확인해 주시겠어요?\" (ASPCA: 병원 먼저, 약은 반드시 수의사와)",
    sources: [
      {"name":"Asher 2020","url":"https://pubmed.ncbi.nlm.nih.gov/32396785/"},
      {"name":"ASPCA 분리불안","url":"https://www.aspca.org/pet-care/dog-care/common-dog-behavior-issues/separation-anxiety"},
      {"name":"ASPCA 「Destructive Chewing」","url":"https://www.aspca.org/pet-care/dog-care/common-dog-behavior-issues/destructive-chewing"},
    ],
  },
  { // 4-6-1
    id: "s4-teeth-1", stage: 4, area: "teeth",
    title: "영구치가 다 났으면 이제 '매일 양치'",
    why: [
      "매일 양치가 가장 좋아요(Merck).",
      "AAHA 치과 지침은 대부분의 개가 3살쯤이면 어느 정도 잇몸병이 있고 보호자는 잘 모른다고 해요.",
      "잇몸염은 닦으면 되돌릴 수 있지만 치주염은 되돌릴 수 없어요(Merck).",
    ],
    how: [
      "하루 한 번, 잇몸 쪽 45도로 바깥 면을 닦아요(CSU, Merck).",
      "못 한 날은 괜찮아요. 일주일에 몇 번도 의미 있는 차이가 있어요(SF SPCA).",
      "칫솔을 거부하면 거즈로, 최소 2~3일에 한 번(Merck).",
      "덴탈 껌은 VOHC 승인 제품을 양치에 더해서(CSU). 간식 10% 안에서(WSAVA).",
    ],
    avoid: [
      "사람 치약(Merck, SF SPCA).",
      "덴탈 껌으로 양치를 대신한다고 생각하기.",
    ],
    ask: "\"치석이 보이는데 스케일링이 필요할까요? 마취는 어떻게 하나요?\" (AAHA는 치과 처치에 전신마취를 지지해요) 입냄새가 심하거나 잇몸이 빨갛거나 보라색이면 진료(Merck).",
    sources: [
      {"name":"Merck 보호자용 개 치아 질환","url":"https://www.merckvetmanual.com/dog-owners/digestive-disorders-of-dogs/dental-disorders-of-dogs"},
      {"name":"CSU 양치법","url":"https://csuveterinaryhealth.org/how-to-brush-your-dogs-teeth/"},
      {"name":"SF SPCA 양치법","url":"https://www.sfspca.org/blog/how-to-brush-your-dogs-teeth/"},
    ],
  },
  { // 4-6-2
    id: "s4-bath-1", stage: 4, area: "bath",
    title: "아기 털이 빠지는 시기, 빗질은 속털까지",
    why: [
      "이중모 견종은 3~6개월쯤 아기 털이 바뀌기 시작해 4~10개월에 듬성해 보이고, 9~12개월쯤 성견 털이 잡힌다는 설명이 많아요(견종 사이트. 기관 근거는 미확인).",
      "이때 속털이 엉키기 쉬워요.",
    ],
    how: [
      "슬리커로 겉털을 빗고, 금속 일자 빗으로 피부 쪽부터 끝까지 걸리지 않는지 확인해요.",
      "마른 털엔 물을 살짝 뿌리고 빗어요.",
      "귀 뒤·겨드랑이·엉덩이를 먼저 봐요.",
      "심하게 엉킨 털은 미용사나 병원에 맡겨요.",
    ],
    avoid: [
      "털이 듬성하다고 바짝 밀기. 다시 자라는 데 12~24개월 걸릴 수 있어요(미네소타대).",
      "털갈이라고 무조건 넘기기. 몇 달째 안 나거나 좌우 대칭으로 빠지면 병원(미네소타대).",
    ],
    ask: "\"털이 몇 달째 안 자라요. 호르몬 검사가 필요할까요?\" (미네소타대: 갑상선·쿠싱 등 감별)",
    sources: [
      {"name":"미네소타대 수의피부과 교재","url":"https://open.lib.umn.edu/animaldermatology2/chapter/canine-post-clipping-alopecia/"},
      {"name":"견종 털 단계","url":"https://pomeranian.org/blog/pomeranian-coat-stages/"},
      {"name":"이중모 빗질","url":"https://pomeranian.org/blog/how-to-brush-pomeranian-dogs-and-puppies/"},
    ],
  },
  { // 4-6-3
    id: "s4-nails-1", stage: 4, area: "nails",
    title: "발톱 2~4주, 엉덩이 끌기는 항문낭 신호",
    why: [
      "다 자란 개 발톱은 보통 2~4주마다 다듬고, 시멘트 길을 자주 걸으면 덜 자주 해도 돼요(동물병원 안내문).",
      "실내 생활이 많으면 발톱이 덜 닳아요.",
      "항문낭 문제는 소형견에 더 흔해요(코넬).",
    ],
    how: [
      "서 있을 때 발톱이 바닥에 닿거나 딱딱 소리가 나면 다듬어요.",
      "밝은 발톱은 분홍 혈관 앞까지만, 검은 발톱은 더 조금씩.",
      "혈관을 자르면 지혈 가루를 대고 몇 분 눌러요.",
      "엉덩이 끌기·자꾸 핥기·비린내가 있으면 항문낭을 의심해요(코넬). 짜기는 병원에 맡겨요.",
    ],
    avoid: [
      "한 번에 많이 자르기.",
      "부은 항문낭을 집에서 억지로 짜기(막힘 → 염증 → 고름집 → 터짐으로 갈 수 있어요, 코넬).",
    ],
    ask: "\"엉덩이를 바닥에 끌어요. 항문낭을 봐 주시겠어요?\" 피가 10분 넘게 멈추지 않거나 항문 옆(4시·8시 방향)이 부으면 바로 연락해요(코넬).",
    sources: [
      {"name":"AKC 발톱 깎기","url":"https://www.akc.org/expert-advice/health/how-to-trim-dogs-nails-safely/"},
      {"name":"코넬 Riney 센터 항문낭","url":"https://www.vet.cornell.edu/departments/riney-canine-health-center/canine-health-information/anal-sac-diseases"},
      {"name":"동물병원 안내문(발톱 주기)","url":"https://www.collegemanorvet.com/dog/nail-trimming-ear-cleaning"},
    ],
  },
  // ── 성견·중년·노령 카드(11/27, ../자료용/자료/2026-11-27-가이드카드-성견-중년-노령.md — merge-guide-cards.py로 넣음) ──
  { // 5-1
    id: "s5-food-1", stage: 5, area: "food",
    title: "하루 2번, 체형 점수 4~5를 지켜요",
    why: [
      "다 자란 뒤엔 크는 데 쓰던 열량이 줄어서 같은 양이면 살이 붙어요.",
      "25% 적게 먹은 래브라도가 수명 중앙값이 길고 만성 질환이 늦었어요(Kealy 2002). AAHA는 이상적인 체형을 9점 중 4.5~5로 봐요.",
    ],
    how: [
      "하루 양을 2번에 나눠 줘요.",
      "한 달에 한 번 손으로 체형을 봐요. 갈비뼈가 살짝 만져지고, 위에서 보면 허리가 들어가 있으면 좋아요(WSAVA).",
      "양은 컵이 아니라 저울로 재요(컵은 매번 달라져요).",
      "산책이 줄어든 달엔 양도 조금 줄여요.",
    ],
    avoid: [
      "포장지 급여표를 정답으로 믿기. 같은 체중이라도 활동량에 따라 달라요.",
      "\"잘 먹으니 건강하다\"며 양을 계속 늘리기.",
    ],
    ask: "\"지금 체형 점수가 몇 점인가요? 하루 열량은 얼마가 맞을까요?\"",
    sources: [
      {"name":"WSAVA 체형 점수(BCS)","url":"https://wsava.org/wp-content/uploads/2020/01/Body-Condition-Score-Dog.pdf"},
      {"name":"Kealy 2002(제한 급여와 수명)","url":"https://pubmed.ncbi.nlm.nih.gov/11991408/"},
      {"name":"AAHA 2023 시니어 지침 영양(BCS 4.5~5)","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/nutrition/"},
    ],
  },
  { // 5-2
    id: "s5-treats-1", stage: 5, area: "treats",
    title: "간식은 하루 열량의 10% 안에서요",
    why: [
      "간식이 많아지면 사료로 맞춘 영양 균형이 흐트러져요(WSAVA).",
      "기준은 개수가 아니라 열량이에요. 작은 개에겐 작은 간식도 커요.",
    ],
    how: [
      "하루 간식은 하루 열량의 10% 미만으로 해요(WSAVA).",
      "훈련 간식은 콩알만 하게 잘라 써요.",
      "하루 사료에서 한 줌을 덜어 간식처럼 써도 돼요.",
      "간식을 많이 준 날은 밥을 조금 줄여요.",
    ],
    avoid: [
      "가족마다 따로 간식 주기. 누가 얼마나 줬는지 모르게 돼요.",
      "사람 음식을 간식으로 주기. 위험한 음식이 섞일 수 있어요.",
    ],
    ask: "\"우리 아이 하루 간식은 몇 kcal까지 괜찮을까요?\"",
    sources: [
      {"name":"WSAVA 간식 주기","url":"https://wsava.org/wp-content/uploads/2024/06/Feeding-treats-to-your-dog-v2.pdf"},
      {"name":"WSAVA 체형 점수(BCS)","url":"https://wsava.org/wp-content/uploads/2020/01/Body-Condition-Score-Dog.pdf"},
    ],
  },
  { // 5-3
    id: "s5-food-2", stage: 5, area: "food",
    title: "사료는 광고 말보다 '질문'으로 골라요",
    why: [
      "'홀리스틱·프리미엄' 같은 말은 규정된 용어가 아니에요(WSAVA).",
      "인터넷 레시피 200개 중 95%가 필수 영양소가 하나 이상 부족했어요(UC Davis).",
    ],
    how: [
      "포장에 '성견용(또는 전 연령용) 완전사료' 표시가 있는지 봐요(WSAVA).",
      "회사에 물어봐요: 수의 영양 전문가가 있나요? 품질 관리는 어떻게 하나요?(WSAVA)",
      "바꿀 땐 7일 이상 섞어서 바꿔요.",
      "집밥을 주고 싶으면 수의 영양 전문가에게 레시피를 받아요.",
    ],
    avoid: [
      "날고기 식단. WSAVA는 권하지 않아요.",
      "인터넷 레시피 그대로 따라 하기.",
    ],
    ask: "\"지금 사료가 우리 아이에게 맞는 완전사료인가요?\"",
    sources: [
      {"name":"WSAVA 사료 고르기","url":"https://wsava.org/wp-content/uploads/2021/04/Selecting-a-pet-food-for-your-pet-updated-2021_WSAVA-Global-Nutrition-Toolkit.pdf"},
      {"name":"UC Davis 집밥 레시피 연구","url":"https://www.ucdavis.edu/news/homemade-dog-food-recipes-can-be-risky-business-study-finds"},
    ],
  },
  { // 5-4
    id: "s5-toys-1", stage: 5, area: "toys",
    title: "한 끼는 노즈워크로, 장난감은 돌려 가며",
    why: [
      "냄새로 먹이를 찾는 놀이를 2주 한 성견들이 더 '낙관적'으로 반응했어요(Duranton 2019).",
      "장난감은 몇 개씩 바꿔 꺼내 주면 더 오래 좋아해요(휴메인 소사이어티).",
    ],
    how: [
      "노즈워크 매트나 접은 수건에 한 끼를 숨겨요.",
      "장난감은 일주일마다 몇 개씩 바꿔 꺼내요.",
      "씹는 장난감은 엄지손톱으로 눌러 자국이 남아야 해요(AAHA).",
      "새 개인기 하나를 하루 몇 분씩 가르쳐요(AKC 두뇌 게임).",
    ],
    avoid: [
      "뼈·뿔처럼 손톱 자국이 안 나는 딱딱한 것. 이가 부러질 수 있어요(AAHA).",
      "삑삑이 인형을 혼자 있을 때 주기.",
    ],
    ask: "\"이빨이 닳거나 금 간 곳이 있나요? 씹는 장난감은 어느 정도가 좋을까요?\"",
    sources: [
      {"name":"Duranton & Horowitz 2019","url":"https://doi.org/10.1016/j.applanim.2018.12.009"},
      {"name":"휴메인 소사이어티 「Dog Toys」","url":"https://www.thehumanesociety.org/dog-toys/"},
      {"name":"AAHA 「Don't Chew On This!」","url":"https://www.aaha.org/resources/dont-chew-on-this/"},
      {"name":"AKC 두뇌 게임","url":"https://www.akc.org/expert-advice/health/fun-cognitive-training-games-for-dogs/"},
    ],
  },
  { // 5-5
    id: "s5-walk-1", stage: 5, area: "walk",
    title: "줄 2m·인식표, 다른 개와는 허락받고 인사해요",
    why: [
      "3개월이 넘은 개는 외출할 때 줄 길이 2m 이하가 법이에요(동물보호법 시행규칙).",
      "모든 개가 인사를 반기진 않아요. 억지 인사는 싸움으로 번질 수 있어요(AKC).",
    ],
    how: [
      "줄은 2m 이하, 엘리베이터·복도에선 안거나 짧게 잡아요.",
      "인식표에 이름·연락처·동물등록번호를 적어요.",
      "다른 개를 만나면 보호자에게 먼저 물어봐요. 인사는 짧게 하고 불러서 떨어져요(AKC).",
      "배설물은 바로 치워요.",
    ],
    avoid: [
      "긴 줄을 풀어 두고 걷기. 50만 원 이하 과태료예요(동물보호법).",
      "몸이 굳거나 꼬리를 마는 신호를 무시하고 인사시키기.",
    ],
    ask: "\"다른 개를 보면 흥분하는데, 연습 방법이 있을까요?\"",
    sources: [
      {"name":"동물보호법 시행규칙","url":"https://www.law.go.kr/법령/동물보호법시행규칙"},
      {"name":"서울시 「펫티켓 길라잡이」","url":"https://news.seoul.go.kr/env/archives/552695"},
      {"name":"AKC 다른 개와 인사","url":"https://www.akc.org/expert-advice/training/dog-to-dog-greetings/"},
    ],
  },
  { // 5-6
    id: "s5-season-1", stage: 5, area: "season",
    title: "여름엔 시원한 시간에, 차 안엔 절대 두지 않아요",
    why: [
      "개는 땀샘이 발바닥에만 있어 헐떡여서 열을 식혀요. 열사병은 응급이에요(코넬).",
      "얼굴이 짧은 견종, 나이 든 개, 살찐 개, 털이 두껍거나 검은 개가 더 위험해요(코넬).",
    ],
    how: [
      "산책은 아침·저녁 시원할 때 해요.",
      "그늘과 물을 자주 챙겨요(코넬).",
      "덥고 습한 날엔 뛰는 운동을 줄여요.",
      "헐떡임이 심하고 침을 흘리면 바로 그늘에서 쉬게 해요.",
    ],
    avoid: [
      "잠깐이라도 차 안에 두기. 온도가 빠르게 올라요(코넬).",
      "더운 날 공 던지기처럼 계속 뛰는 놀이.",
    ],
    ask: "\"우리 아이는 열사병 위험이 큰 편인가요?\"",
    sources: [
      {"name":"코넬 Riney 센터 「Heatstroke」","url":"https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-information/heatstroke-medical-emergency"},
    ],
  },
  { // 5-7
    id: "s5-season-2", stage: 5, area: "season",
    title: "겨울엔 제설제 길을 피하고 발을 닦아요",
    why: [
      "제설제는 발바닥을 자극하고, 핥으면 탈이 날 수 있어요(VCA).",
      "눈 덩어리를 먹으면 제설제까지 먹게 돼요.",
    ],
    how: [
      "하얀 알갱이가 뿌려진 길은 피해 걸어요.",
      "산책 뒤 미지근한 물수건으로 발바닥과 발가락 사이를 닦아요.",
      "발바닥이 갈라졌는지 봐요.",
    ],
    avoid: [
      "발을 안 닦고 그대로 핥게 두기.",
      "눈 먹게 두기.",
    ],
    ask: "\"발바닥이 자꾸 갈라지는데 어떻게 관리할까요?\"",
    sources: [
      {"name":"VCA 제설제","url":"https://vcahospitals.com/resources/lifestyle-dog/hazards-safety/dog-be-careful-with-ice-melt"},
    ],
  },
  { // 5-8
    id: "s5-checkup-1", stage: 5, area: "checkup",
    title: "병원은 1년에 한 번 이상, 집에선 한 달에 한 번",
    why: [
      "VCA는 집에서 한 달에 한 번 몸 구석구석을 확인하라고 해요. 평소 모습을 알면 달라진 걸 빨리 봐요.",
      "검진 날 병원에서 쌓인 기록은 나이 들었을 때 비교할 기준이 돼요.",
    ],
    how: [
      "1년에 한 번 이상 건강검진을 받아요. 접종·심장사상충 검사와 같은 날 하면 편해요.",
      "한 달에 한 번 집에서 눈·귀·입·피부·발을 봐요(VCA).",
      "혹이 만져지면 위치·크기·날짜를 적어요.",
      "평소 물 마시는 양, 변 모양을 알아 둬요.",
    ],
    avoid: [
      "\"밥 잘 먹으니 괜찮다\"며 검진 미루기.",
    ],
    ask: "\"우리 아이 나이와 견종에 맞는 검진 주기와 항목을 알려 주세요.\"",
    sources: [
      {"name":"VCA 집에서 하는 건강 체크","url":"https://vcahospitals.com/know-your-pet/giving-your-dog-a-thorough-home-check-up"},
    ],
  },
  { // 5-9
    id: "s5-vaccine-1", stage: 5, area: "vaccine",
    title: "핵심 백신은 병원과 간격을, 광견병은 매년",
    why: [
      "WSAVA는 핵심 백신을 1살 추가 접종 뒤 '3년보다 자주 하지 않도록' 권해요.",
      "광견병은 국내에서 매년 맞아요(지자체 안내).",
    ],
    how: [
      "우리 아이가 언제 무엇을 맞았는지 접종 수첩을 앱에 옮겨 둬요.",
      "핵심 백신 다음 날짜는 병원과 정해요.",
      "광견병은 1년마다 맞아요. 지자체 일제 접종이 있는지 구청에 물어봐요.",
    ],
    avoid: [
      "핵심 백신을 습관처럼 매년 다 맞기. 병원과 간격을 정해요.",
      "접종 기록 없이 병원을 옮기기.",
    ],
    ask: "\"핵심 백신은 다음에 언제 맞으면 될까요? 항체 검사가 필요한가요?\"",
    sources: [
      {"name":"WSAVA 접종 지침","url":"https://pmc.ncbi.nlm.nih.gov/articles/PMC7166871/"},
      {"name":"광견병 지자체 안내","url":"https://www.yeonsu.go.kr/main/part/economy/animal_vaccination.asp"},
    ],
  },
  { // 5-10
    id: "s5-parasite-1", stage: 5, area: "parasite",
    title: "심장사상충은 매년 검사, 진드기는 산책 뒤 확인",
    why: [
      "심장사상충은 모기로 옮고, 국내 반려견에서도 양성이 나와요(데일리벳).",
      "진드기는 사람에게도 위험한 SFTS를 옮길 수 있어요(데일리벳).",
    ],
    how: [
      "심장사상충 예방은 1년 내내, 검사는 매년 해요(AHS).",
      "장내 기생충 변 검사는 1년에 몇 번 할지 병원과 정해요(CAPC).",
      "풀숲 산책 뒤엔 귀·목줄 아래·겨드랑이·발가락 사이를 손으로 훑어요.",
      "진드기를 찾으면 맨손으로 떼지 말고 병원에 물어요.",
    ],
    avoid: [
      "\"겨울엔 안 해도 된다\"고 혼자 정하기(AHS·CAPC는 1년 내내).",
      "큰 개 약을 나눠 먹이기.",
    ],
    ask: "\"심장사상충·장내·진드기를 함께 막는 방법이 우리 아이에게 맞나요?\"",
    sources: [
      {"name":"AHS 심장사상충 기본","url":"https://www.heartwormsociety.org/pet-owner-resources/heartworm-basics"},
      {"name":"CAPC 일반 지침","url":"https://capcvet.org/guidelines/general-guidelines/"},
      {"name":"국내 양성률(데일리벳, 2023-06)","url":"https://www.dailyvet.co.kr/?p=186717"},
      {"name":"진드기·SFTS(데일리벳)","url":"https://www.dailyvet.co.kr/?p=249684"},
    ],
  },
  { // 5-11
    id: "s5-teeth-1", stage: 5, area: "teeth",
    title: "양치는 매일, 스케일링은 마취해서 제대로",
    why: [
      "매일 양치가 가장 좋고, 소형견에 잇몸병이 더 많아요(Merck).",
      "마취 없이 하는 스케일링은 보이는 겉만 닦아서 \"괜찮다\"는 착각을 준다고 AAHA가 말해요.",
    ],
    how: [
      "하루 한 번, 30초라도 칫솔질해요. 못 한 날이 있어도 괜찮아요.",
      "한 달에 한 번 입술을 들어 잇몸 색과 치석을 봐요.",
      "검진 때마다 입 안을 봐 달라고 해요.",
      "덴탈 껌을 고른다면 VOHC 인증을 확인해요.",
    ],
    avoid: [
      "무마취 스케일링. AAHA는 스트레스·부상·흡인 위험과 진단이 안 된다는 이유로 적절하지 않다고 해요.",
      "사람 치약 쓰기.",
    ],
    ask: "\"치석이 어느 정도인가요? 마취 스케일링은 언제쯤 하면 될까요?\"",
    sources: [
      {"name":"Merck 개 치과 질환","url":"https://www.merckvetmanual.com/dog-owners/digestive-disorders-of-dogs/dental-disorders-of-dogs"},
      {"name":"AAHA 무마취 치과","url":"https://www.aaha.org/resources/2019-aaha-dental-care-guidelines-for-dogs-and-cats/nonanesthetic-dentistry/"},
      {"name":"콜로라도주립대 수의병원 양치법","url":"https://csuveterinaryhealth.org/how-to-brush-your-dogs-teeth/"},
    ],
  },
  { // 5-12
    id: "s5-behavior-1", stage: 5, area: "behavior",
    title: "짖음은 이유부터, 훈련은 칭찬으로 이어 가요",
    why: [
      "짖는 이유는 경계·심심함·관심·불안 등으로 다르고, 이유에 따라 대처도 달라요(AKC).",
      "AVSAB는 벌 대신 보상 기반 훈련을 권해요. 벌은 두려움과 공격성을 키울 수 있어요.",
    ],
    how: [
      "언제·어디서·무엇에 짖는지 일주일 적어 봐요.",
      "조용해지는 순간을 칭찬하고 간식을 줘요.",
      "심심해서 짖는다면 노즈워크·산책을 늘려요(AKC).",
      "갑자기 짖음·입질이 늘었다면 먼저 병원에서 아픈 곳이 없는지 봐요(AAHA).",
    ],
    avoid: [
      "소리치기·때리기·전기 충격 목걸이(AVSAB).",
      "짖을 때마다 쳐다보고 말 걸기. 관심 짖음이 늘 수 있어요(AKC).",
    ],
    ask: "\"행동이 갑자기 바뀌었는데, 몸에 아픈 곳이 있는지 봐 주실 수 있나요?\"",
    sources: [
      {"name":"AKC 짖음 줄이기","url":"https://www.akc.org/expert-advice/training/how-to-stop-dog-barking/"},
      {"name":"AVSAB 2021 인도적 훈련 입장문","url":"https://avsab.org/wp-content/uploads/2024/12/AVSAB-Humane-Dog-Training-Position-Statement-2021.pdf"},
      {"name":"AAHA 2015 행동 관리 지침","url":"https://www.aaha.org/resources/2015-aaha-canine-and-feline-behavior-management-guidelines/"},
    ],
  },
  { // 5-13
    id: "s5-weight-1", stage: 5, area: "weight",
    title: "몸무게는 매달 같은 저울로 적어요",
    why: [
      "미국 동물병원 평가에서 개의 59%가 과체중이나 비만이었어요(APOP 2022).",
      "작은 개는 몇백 그램도 몸무게의 큰 비율이에요. 3kg 아이의 300g은 10%예요(계산).",
    ],
    how: [
      "한 달에 한 번, 같은 저울·비슷한 시간에 재요.",
      "안고 잰 뒤 내 몸무게를 빼는 방법도 괜찮아요.",
      "체형 점수(BCS)도 같이 적어요(WSAVA).",
      "줄여야 하면 한 주에 몸무게의 1~2%씩 천천히 해요(코넬).",
    ],
    avoid: [
      "굶겨서 빨리 빼기.",
      "\"조금 통통한 게 귀엽다\"는 기준.",
    ],
    ask: "\"목표 체중을 정해 주실 수 있나요?\"",
    sources: [
      {"name":"APOP 2022 조사","url":"https://www.petobesityprevention.org/2022"},
      {"name":"WSAVA 체형 점수(BCS)","url":"https://wsava.org/wp-content/uploads/2020/01/Body-Condition-Score-Dog.pdf"},
      {"name":"코넬 Riney 센터 비만·감량","url":"https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-topics/obesity-and-weight-loss-dogs"},
    ],
  },
  { // 5-14
    id: "s5-bath-1", stage: 5, area: "bath",
    title: "목욕은 필요할 때, 이중모는 밀지 않아요",
    why: [
      "너무 자주 씻으면 피부 기름이 빠져 건조해질 수 있어요(AKC).",
      "이중모를 짧게 밀면 털이 다시 안 자라는 경우가 있어요(미네소타대 수의피부과).",
    ],
    how: [
      "냄새·오염이 있을 때 강아지 전용 샴푸로 씻어요.",
      "다 씻은 뒤엔 속까지 바짝 말려요.",
      "빗질은 자주, 짧게 해요.",
      "발톱·귀는 한 달에 한 번 확인해요.",
    ],
    avoid: [
      "더위를 피하려고 이중모를 바짝 밀기.",
      "사람 샴푸 쓰기.",
    ],
    ask: "\"우리 아이 털에는 목욕을 얼마나 자주 하면 될까요?\"",
    sources: [
      {"name":"AKC 목욕","url":"https://www.akc.org/expert-advice/health/bathing-puppy-bath-shampoo-care/"},
      {"name":"미네소타대 수의피부과 교재(클리핑 후 탈모)","url":"https://open.lib.umn.edu/animaldermatology2/chapter/canine-post-clipping-alopecia/"},
    ],
  },
  { // 6-1
    id: "s6-food-1", stage: 6, area: "food",
    title: "덜 움직이면 밥도 조금 덜어요",
    why: [
      "개가 하루에 쓰는 열량은 나이가 들수록 대체로 줄어요(AAHA).",
      "살이 찌면 관절과 몸 속 염증에 부담이 돼요(AAHA).",
    ],
    how: [
      "산책 시간이 줄었다면 하루 양을 조금 줄여요.",
      "한 달에 한 번 체형 점수(BCS)를 손으로 봐요(WSAVA).",
      "사료를 바꿀 땐 7일 이상 섞어서 바꿔요.",
      "\"노령견용\"으로 바꿀지는 병원과 정해요.",
    ],
    avoid: [
      "나이만 보고 사료를 바로 바꾸기.",
      "줄어든 밥만큼 간식으로 채우기.",
    ],
    ask: "\"지금 활동량이면 하루 열량을 얼마로 맞추면 될까요?\"",
    sources: [
      {"name":"AAHA 2023 시니어 지침 영양","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/nutrition/"},
      {"name":"WSAVA 체형 점수(BCS)","url":"https://wsava.org/wp-content/uploads/2020/01/Body-Condition-Score-Dog.pdf"},
    ],
  },
  { // 6-2
    id: "s6-weight-1", stage: 6, area: "weight",
    title: "빼야 한다면 한 주에 1~2%씩 천천히",
    why: [
      "급하게 빼면 근육이 빠지고 다시 찌기 쉬워요. 코넬은 한 주에 몸무게의 1~2%를 권해요.",
      "필요한 열량은 수의사가 계산해 주는 게 정확해요(코넬).",
    ],
    how: [
      "목표 체중과 하루 열량을 병원에서 받아요.",
      "관리 중엔 적어도 2주마다 같은 저울로 재요(코넬).",
      "간식은 하루 열량의 10% 안으로 줄여요(WSAVA).",
      "걷는 시간을 조금씩 늘려요.",
    ],
    avoid: [
      "굶기거나 한 끼 거르기.",
      "가족 중 한 명만 몰래 간식 주기.",
    ],
    ask: "\"목표 체중과 하루 열량을 정해 주실 수 있나요?\"",
    sources: [
      {"name":"코넬 Riney 센터 비만·감량","url":"https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-topics/obesity-and-weight-loss-dogs"},
      {"name":"WSAVA 간식 주기","url":"https://wsava.org/wp-content/uploads/2024/06/Feeding-treats-to-your-dog-v2.pdf"},
    ],
  },
  { // 6-3
    id: "s6-water-1", stage: 6, area: "water",
    title: "물 마시는 양이 늘면 재 봐요",
    why: [
      "개는 보통 하루에 1kg당 40~60ml를 마셔요(코넬).",
      "하루 1kg당 100ml가 넘으면 많이 마시는 것으로 보고 병원에 가요(코넬).",
    ],
    how: [
      "물그릇에 정한 양을 붓고 24시간 뒤 남은 양을 빼요.",
      "더운 날·산책 많이 한 날은 따로 적어요.",
      "3kg이면 하루 300ml가 100ml/kg이에요(계산).",
      "소변 양·횟수가 늘었는지도 같이 봐요.",
    ],
    avoid: [
      "많이 마신다고 물을 줄이기. 코넬은 진단 전 물을 제한하지 말라고 해요.",
    ],
    ask: "\"요즘 하루에 ○ml쯤 마셔요. 검사가 필요할까요?\"",
    sources: [
      {"name":"코넬 Riney 센터 다음·다뇨","url":"https://riney.vet.cornell.edu/member-benefits-health-tips/polyuria-polydipsia-april-2024"},
    ],
  },
  { // 6-4
    id: "s6-toys-1", stage: 6, area: "toys",
    title: "뛰는 놀이 조금, 머리 쓰는 놀이 조금 더",
    why: [
      "냄새 찾기·개인기 같은 두뇌 게임은 관절 부담 없이 지루함을 덜어 줘요(AKC).",
      "오래 씹어 온 이는 닳거나 금이 갈 수 있어요. 딱딱한 장난감이 원인이 되기도 해요(AAHA).",
    ],
    how: [
      "간식 숨기기·컵 게임 같은 두뇌 게임을 해요(AKC).",
      "씹는 장난감을 엄지손톱으로 다시 눌러 봐요. 자국이 남아야 해요(AAHA).",
      "공 던지기는 짧게, 미끄럽지 않은 바닥에서 해요.",
    ],
    avoid: [
      "뼈·뿔처럼 아주 딱딱한 것 주기(AAHA).",
      "계단·소파에서 뛰어내리는 놀이.",
    ],
    ask: "\"이가 닳거나 금 간 곳이 있나요?\"",
    sources: [
      {"name":"AKC 두뇌 게임","url":"https://www.akc.org/expert-advice/health/fun-cognitive-training-games-for-dogs/"},
      {"name":"AAHA 「Don't Chew On This!」","url":"https://www.aaha.org/resources/dont-chew-on-this/"},
    ],
  },
  { // 6-5
    id: "s6-walk-1", stage: 6, area: "walk",
    title: "절뚝임·뻣뻣함은 영상으로 남겨요",
    why: [
      "보호자는 통증으로 생긴 변화를 '나이 탓'으로 넘기기 쉬워요(AAHA).",
      "AAHA는 보호자가 찍은 걷는 영상이 진료에 도움이 된다고 해요.",
    ],
    how: [
      "일어날 때, 계단 오를 때, 산책 끝무렵을 10초씩 찍어요.",
      "절뚝인 날짜와 어느 다리인지 적어요.",
      "산책을 짧게 여러 번으로 나눠 봐요.",
      "병원 갈 때 영상을 보여 줘요.",
    ],
    avoid: [
      "사람 진통제 먹이기. 개에게 위험할 수 있어요.",
      "\"원래 그래\" 하고 넘기기.",
    ],
    ask: "\"걷는 영상을 찍어 왔어요. 관절 통증일 수 있을까요?\"",
    sources: [
      {"name":"AAHA 2023 시니어 지침 통증 관리","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/pain-management/"},
      {"name":"AAHA 2023 건강한 시니어 평가","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/evaluating-the-healthy-senior-pet/"},
    ],
  },
  { // 6-6
    id: "s6-safety-1", stage: 6, area: "safety",
    title: "미끄러운 바닥엔 깔개, 높은 곳엔 경사로",
    why: [
      "AAHA는 깔개·요가 매트로 발 디딜 곳을 만들고, 경사로를 쓰라고 권해요.",
      "미리 바꿔 두면 관절이 아파지기 전에 습관이 돼요.",
    ],
    how: [
      "자주 다니는 길과 밥 먹는 자리에 미끄럼 방지 깔개를 깔아요.",
      "소파·침대에 오르는 곳엔 경사로나 계단을 둬요.",
      "발바닥 털이 패드를 덮으면 다듬어요.",
    ],
    avoid: [
      "높은 곳에서 뛰어내리게 두기.",
    ],
    ask: "\"집에서 관절 부담을 줄이려면 무엇부터 바꾸면 좋을까요?\"",
    sources: [
      {"name":"AAHA 2023 시니어 지침 통증 관리(집 환경)","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/pain-management/"},
    ],
  },
  { // 6-7
    id: "s6-walk-2", stage: 6, area: "walk",
    title: "목줄보다 가슴줄, 거위 소리 기침은 기록해요",
    why: [
      "기관이 약해지면 '거위 우는 소리' 같은 마른기침이 나요. 목줄로 목을 누르면 더 심해질 수 있어요(VCA).",
      "VCA는 목줄 대신 가슴줄을 쓰고, 체중을 관리하라고 해요.",
    ],
    how: [
      "산책엔 가슴줄(하네스)을 써요.",
      "기침이 언제 나는지 적어요. 흥분할 때, 먹고 마신 직후, 덥고 습할 때, 밤 등(VCA).",
      "기침 소리를 휴대폰으로 녹음해 둬요.",
      "담배 연기 같은 자극은 피해요(VCA).",
    ],
    avoid: [
      "줄을 세게 당기기.",
      "기침이 계속되는데 지켜만 보기.",
    ],
    ask: "\"이런 기침을 해요(녹음). 기관 문제일 수 있을까요?\"",
    sources: [
      {"name":"VCA 기관지 협착","url":"https://vcahospitals.com/know-your-pet/tracheal-collapse-in-dogs"},
    ],
  },
  { // 6-8
    id: "s6-checkup-1", stage: 6, area: "checkup",
    title: "혈액·소변 '건강할 때 기준값'을 만들어요",
    why: [
      "AAHA는 시니어에게 1년에 1~2번 혈액·소변 검사를 권해요.",
      "건강할 때 값이 있으면 나중에 달라진 걸 비교하기 쉬워요.",
    ],
    how: [
      "다음 검진 때 혈액·소변 검사를 같이 할지 상담해요.",
      "결과지는 사진으로 찍어 앱에 남겨요.",
      "AAHA는 시니어에게 혈압·심장사상충 검사를 매년 권해요.",
    ],
    avoid: [
      "결과지를 병원에만 두기.",
    ],
    ask: "\"지금 나이에 기준값으로 어떤 검사를 해 두면 좋을까요?\"",
    sources: [
      {"name":"AAHA 시니어 검사 항목·빈도 표","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/diagnostic-tests-and-recommended-frequencies-for-senior-dogs-and-cats/"},
      {"name":"AAHA 2023 건강한 시니어 평가","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/evaluating-the-healthy-senior-pet/"},
    ],
  },
  { // 6-9
    id: "s6-checkup-2", stage: 6, area: "checkup",
    title: "혹은 위치·크기·날짜를 적어요",
    why: [
      "AAHA는 순한 혹과 그렇지 않은 혹이 겉으로 구별이 안 될 수 있어 \"지켜보기\"가 위험하다고 해요.",
      "병원은 혹의 크기를 재고 세포 검사를 해요(AAHA).",
    ],
    how: [
      "한 달에 한 번 온몸을 손으로 쓸어 봐요(VCA).",
      "혹이 있으면 위치를 그림에 표시하고, 크기를 동전과 비교해 사진을 찍어요.",
      "날짜를 적고 병원에 보여 줘요.",
    ],
    avoid: [
      "\"지방 혹이겠지\" 하고 몇 달 두기.",
      "혹을 짜거나 누르기.",
    ],
    ask: "\"이 혹은 세포 검사가 필요할까요?\"",
    sources: [
      {"name":"AAHA 2023 건강한 시니어 평가(혹)","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/evaluating-the-healthy-senior-pet/"},
      {"name":"VCA 집에서 하는 건강 체크","url":"https://vcahospitals.com/know-your-pet/giving-your-dog-a-thorough-home-check-up"},
    ],
  },
  { // 6-10
    id: "s6-checkup-3", stage: 6, area: "checkup",
    title: "잘 때 1분 호흡수를 가끔 세어 둬요",
    why: [
      "깊이 잘 때 가슴이 오르내리는 횟수는 심장 상태를 볼 수 있는 간단한 숫자예요(코넬).",
      "쉬거나 잘 때 35회를 넘으면 바로 병원에 가요(코넬).",
    ],
    how: [
      "꿈꾸지 않고 깊이 잘 때 재요.",
      "15초 세고 ×4 하거나, 1분을 세요(코넬).",
      "평소 값을 몇 번 적어 두면 달라진 걸 알기 쉬워요.",
      "심장 진단을 받았다면 수의사가 정한 기준을 따라요.",
    ],
    avoid: [
      "깨어 있거나 더울 때 잰 숫자로 걱정하기.",
    ],
    ask: "\"잘 때 호흡수가 평소보다 늘었어요. 진료가 필요할까요?\"",
    sources: [
      {"name":"코넬 Riney 센터 심잡음(호흡수)","url":"https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-information/get-jump-heart-murmurs"},
      {"name":"VCA 집에서 호흡수 재기","url":"https://vcahospitals.com/know-your-pet/home-breathing-rate-evaluation"},
    ],
  },
  { // 6-11
    id: "s6-behavior-1", stage: 6, area: "behavior",
    title: "예민해졌다면 아픈 곳이 있는지부터 봐요",
    why: [
      "오래된 통증은 행동 변화로 조용히 나타나 보호자가 알아채기 어려워요(AAHA).",
      "AAHA는 행동 문제 전에 몸의 원인을 먼저 확인하라고 해요.",
    ],
    how: [
      "만지면 피하는 곳, 으르렁대는 때를 적어요.",
      "안 하던 행동(숨기, 계단 안 오르기)을 날짜와 함께 적어요.",
      "병원에서 통증 확인을 먼저 해요.",
    ],
    avoid: [
      "혼내기. 아파서 하는 행동일 수 있어요.",
    ],
    ask: "\"요즘 만지면 싫어해요. 통증이 있는지 봐 주실 수 있나요?\"",
    sources: [
      {"name":"AAHA 2023 시니어 지침 통증 관리","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/pain-management/"},
      {"name":"AAHA 2015 행동 관리 지침","url":"https://www.aaha.org/resources/2015-aaha-canine-and-feline-behavior-management-guidelines/"},
    ],
  },
  { // 6-12
    id: "s6-behavior-2", stage: 6, area: "behavior",
    title: "천둥·불꽃놀이엔 미리 안전한 방을 만들어요",
    why: [
      "나이가 들며 큰 소리 공포가 심해지기도 해요(코넬).",
      "무서우면 도망치다 길을 잃을 수 있어요(코넬).",
    ],
    how: [
      "익숙한 방, 창문이 적은 곳에 푹신한 자리를 만들어요(코넬).",
      "백색소음이나 잔잔한 음악을 틀어요(코넬).",
      "소리가 나기 전에 산책·배변을 마쳐요(코넬).",
      "인식표와 등록 정보를 다시 확인해요.",
    ],
    avoid: [
      "혼내기. 더 무서워해요(코넬).",
      "무서워하는 날 혼자 두기(코넬).",
    ],
    ask: "\"소리 공포가 심해요. 미리 할 수 있는 방법이 있을까요?\"",
    sources: [
      {"name":"코넬 Riney 센터 「Fear of fireworks and thunderstorms」","url":"https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-topics/fear-fireworks-and-thunderstorms"},
    ],
  },
  { // 6-13
    id: "s6-teeth-1", stage: 6, area: "teeth",
    title: "작은 개일수록 잇몸을 더 챙겨요",
    why: [
      "잇몸병은 작은 개, 나이 든 개에게 더 많아요(AAHA).",
      "입 안을 제대로 치료하려면 마취가 필요해요(AAHA).",
    ],
    how: [
      "양치는 매일 이어 가요.",
      "한쪽으로만 씹거나 사료를 흘리면 적어 둬요.",
      "검진 때 입 안을 꼭 봐 달라고 해요.",
      "스케일링 전 마취 검사는 병원과 상의해요.",
    ],
    avoid: [
      "무마취 스케일링(AAHA: 부적절).",
    ],
    ask: "\"잇몸 상태가 어떤가요? 치과 치료가 필요할까요?\"",
    sources: [
      {"name":"AAHA 2023 시니어 지침 치과","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/dentistry/"},
      {"name":"AAHA 무마취 치과","url":"https://www.aaha.org/resources/2019-aaha-dental-care-guidelines-for-dogs-and-cats/nonanesthetic-dentistry/"},
    ],
  },
  { // 6-14
    id: "s6-alone-1", stage: 6, area: "alone",
    title: "혼자 있는 시간, 요즘 괜찮은지 다시 봐요",
    why: [
      "혼자 있을 때 짖기·뜯기·배변 실수는 분리불안 신호일 수 있어요(ASPCA).",
      "소리 공포가 있는 개는 분리불안도 함께 있는 경우가 많아요(코넬).",
    ],
    how: [
      "나갈 때 홈캠으로 처음 30분을 봐요.",
      "나갈 때 오래 걸리는 사료 장난감을 줘요(ASPCA).",
      "인사는 짧고 조용하게 해요(ASPCA).",
    ],
    avoid: [
      "돌아와서 사고 친 걸 혼내기(ASPCA).",
    ],
    ask: "\"혼자 있을 때 불안해하는 것 같아요. 행동 진료가 필요할까요?\"",
    sources: [
      {"name":"ASPCA 분리불안","url":"https://www.aspca.org/pet-care/dog-care/common-dog-behavior-issues/separation-anxiety"},
      {"name":"코넬 Riney 센터 소리 공포","url":"https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-topics/fear-fireworks-and-thunderstorms"},
    ],
  },
  { // 7-1
    id: "s7-weight-1", stage: 7, area: "weight",
    title: "몸무게와 함께 '근육'도 봐요",
    why: [
      "나이 든 개는 근육이 줄고 지방이 늘다가, 더 나이 들면 몸무게가 빠지기도 해요(AAHA).",
      "AAHA는 체형 점수와 함께 근육 점수를 보라고 해요.",
    ],
    how: [
      "한 달에 한 번 같은 저울로 재요.",
      "등뼈 양옆, 어깨, 허벅지 근육을 손으로 만져 봐요.",
      "전보다 뼈가 도드라지면 날짜와 함께 적어요.",
      "이유 없이 몸무게가 빠지면 병원에 가요.",
    ],
    avoid: [
      "\"나이 들어 그래\" 하고 체중 감소를 넘기기.",
    ],
    ask: "\"근육 점수(MCS)는 몇 점인가요? 단백질을 더 챙겨야 할까요?\"",
    sources: [
      {"name":"AAHA 2023 시니어 지침 영양","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/nutrition/"},
      {"name":"WSAVA 체형 점수(BCS)","url":"https://wsava.org/wp-content/uploads/2020/01/Body-Condition-Score-Dog.pdf"},
    ],
  },
  { // 7-2
    id: "s7-food-1", stage: 7, area: "food",
    title: "노령견 사료는 병원과 함께 골라요",
    why: [
      "미국 사료 기준(AAFCO)에는 아직 '노령견용' 기준이 따로 없어요(AAHA).",
      "건강한 노령견은 열량은 조금 낮고, 섬유질과 좋은 단백질은 조금 더 필요해요(AAHA).",
    ],
    how: [
      "사료를 바꾸기 전에 체형·근육 점수를 먼저 봐요.",
      "씹기 힘들어하면 사료에 물을 섞어 봐요. 물을 섞었더니 노령견의 소화율이 올랐다는 연구가 있어요(AAHA).",
      "바꿀 땐 7일 이상 섞어서 바꿔요.",
      "먹는 양이 줄면 날짜와 함께 적어요.",
    ],
    avoid: [
      "포장의 '시니어' 글자만 보고 고르기.",
      "영양제를 병원에 말하지 않고 먹이기. 약과 부딪칠 수 있어요(AAHA).",
    ],
    ask: "\"지금 몸 상태에 맞는 사료와 하루 양을 알려 주세요.\"",
    sources: [
      {"name":"AAHA 2023 시니어 지침 영양","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/nutrition/"},
      {"name":"AAHA 2023 건강한 시니어 평가(영양제)","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/evaluating-the-healthy-senior-pet/"},
    ],
  },
  { // 7-3
    id: "s7-water-1", stage: 7, area: "water",
    title: "물·소변이 늘었는지 일주일에 한 번 재요",
    why: [
      "하루 1kg당 100ml 넘게 마시면 많이 마시는 것이에요(코넬). 콩팥·호르몬 문제의 신호일 수 있어요.",
      "AAHA는 시니어에게 6~12개월마다 소변 검사를 권해요.",
    ],
    how: [
      "일주일에 한 번, 24시간 마신 양을 재요.",
      "실내 배변 실수, 밤에 소변이 늘었는지 적어요.",
      "많이 마시는 날이 며칠 이어지면 병원에 가요.",
      "병원 갈 때 아침 첫 소변을 받아 갈지 물어봐요.",
    ],
    avoid: [
      "실수가 잦다고 물을 줄이기(코넬: 진단 전 제한 금지).",
    ],
    ask: "\"물을 하루 ○ml 마셔요. 소변 검사가 필요할까요?\"",
    sources: [
      {"name":"코넬 Riney 센터 다음·다뇨","url":"https://riney.vet.cornell.edu/member-benefits-health-tips/polyuria-polydipsia-april-2024"},
      {"name":"AAHA 시니어 검사 항목·빈도 표","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/diagnostic-tests-and-recommended-frequencies-for-senior-dogs-and-cats/"},
    ],
  },
  { // 7-4
    id: "s7-teeth-1", stage: 7, area: "teeth",
    title: "씹기 힘들어하면 입이 아픈 건 아닌지 봐요",
    why: [
      "사료를 물기·씹기·삼키기 힘들어하면 입 안 검사가 필요해요(AAHA).",
      "나이 든 개는 입 안 혹도 더 많아서 일찍 찾는 게 중요해요(AAHA).",
    ],
    how: [
      "밥 먹는 모습을 영상으로 찍어 병원에 보여 줘요(AAHA).",
      "한쪽으로만 씹기, 사료 흘리기, 입 냄새 변화를 적어요.",
      "양치는 아파하지 않는 만큼만 이어 가요.",
      "병원 갈 때마다 입 안을 봐 달라고 해요(AAHA).",
    ],
    avoid: [
      "\"나이 들어 입맛이 없다\"고 넘기기.",
      "무마취 스케일링(AAHA: 부적절).",
    ],
    ask: "\"밥을 흘리고 한쪽으로 씹어요. 치과 검사가 필요할까요?\"",
    sources: [
      {"name":"AAHA 2023 시니어 지침 치과","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/dentistry/"},
      {"name":"AAHA 무마취 치과","url":"https://www.aaha.org/resources/2019-aaha-dental-care-guidelines-for-dogs-and-cats/nonanesthetic-dentistry/"},
    ],
  },
  { // 7-5
    id: "s7-toys-1", stage: 7, area: "toys",
    title: "냄새 놀이를 짧게, 자주 해요",
    why: [
      "새 장난감·두뇌 게임 같은 자극은 인지 변화 관리에 함께 쓰여요(AAHA).",
      "냄새 찾기는 많이 뛰지 않아도 돼요(AKC 두뇌 게임).",
    ],
    how: [
      "간식 몇 알을 바닥에 숨겨 찾게 해요.",
      "한 번에 몇 분씩, 하루 여러 번 나눠요.",
      "씹는 장난감은 부드러운 것으로 바꿔요.",
      "예전에 배운 쉬운 신호를 다시 해 보고 칭찬해요.",
    ],
    avoid: [
      "지쳐서 엎드리는데 계속하기.",
    ],
    ask: "\"집에서 해 줄 수 있는 두뇌 놀이를 추천해 주세요.\"",
    sources: [
      {"name":"AAHA 2023 인지기능장애·불안 관리","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/managing-cognitive-dysfunction-and-behavioral-anxiety/"},
      {"name":"AKC 두뇌 게임","url":"https://www.akc.org/expert-advice/health/fun-cognitive-training-games-for-dogs/"},
    ],
  },
  { // 7-6
    id: "s7-walk-1", stage: 7, area: "walk",
    title: "일어나기 힘들어하면 '나이'보다 '통증'을 의심해요",
    why: [
      "보호자는 통증을 나이 탓으로 보기 쉬워요(AAHA).",
      "통증은 일찍 다룰수록 결과가 좋아요(AAHA).",
    ],
    how: [
      "눕고 일어날 때, 계단, 차 타기를 힘들어하는지 봐요.",
      "걷는 모습을 영상으로 찍어 병원에 보여 줘요(AAHA).",
      "산책은 짧게, 평평한 길로 나눠 가요.",
      "체중 관리도 통증 관리의 하나예요(AAHA).",
    ],
    avoid: [
      "사람 진통제 먹이기.",
      "아파하는데 억지로 오래 걷기.",
    ],
    ask: "\"일어날 때 힘들어해요(영상). 통증 관리가 필요할까요?\"",
    sources: [
      {"name":"AAHA 2023 시니어 지침 통증 관리","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/pain-management/"},
      {"name":"VCA 집에서 하는 건강 체크","url":"https://vcahospitals.com/know-your-pet/giving-your-dog-a-thorough-home-check-up"},
    ],
  },
  { // 7-7
    id: "s7-safety-1", stage: 7, area: "safety",
    title: "깔개·경사로·그릇 높이로 집을 바꿔요",
    why: [
      "AAHA는 깔개나 요가 매트, 경사로, 높인 밥·물그릇, 맞는 침대를 권해요.",
      "눈·귀가 어두워지면 계단이나 물가가 위험해져요(AAHA).",
    ],
    how: [
      "다니는 길에 미끄럼 방지 깔개를 깔아요.",
      "소파·침대엔 경사로를 두거나 올라가지 않게 해요.",
      "밥·물그릇을 조금 높여요.",
      "계단 입구엔 안전문을 달아요.",
    ],
    avoid: [
      "가구 배치를 자주 바꾸기. 눈이 어두운 아이는 길을 외워 다녀요.",
    ],
    ask: "\"우리 집에서 위험한 곳이 어디일까요?\"",
    sources: [
      {"name":"AAHA 2023 시니어 지침 통증 관리(집 환경)","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/pain-management/"},
    ],
  },
  { // 7-8
    id: "s7-checkup-1", stage: 7, area: "checkup",
    title: "검진은 1년에 1~2번, 검사 항목은 함께 정해요",
    why: [
      "AAHA는 시니어에게 1년에 1~2번 혈액·소변 등 검사를 권해요.",
      "혈액·소변 검사는 6~12개월마다, 혈압·심장사상충은 매년이에요(AAHA 표).",
    ],
    how: [
      "6개월마다 검진 알림을 맞춰요.",
      "먹는 약·영양제·연고를 모두 적어 가요(AAHA).",
      "걷는 영상, 물 마신 양, 호흡수 기록을 챙겨 가요.",
      "결과지는 사진으로 남겨요.",
    ],
    avoid: [
      "아플 때만 병원 가기.",
    ],
    ask: "\"이번 검진에 어떤 검사가 필요할까요? 다음은 언제 올까요?\"",
    sources: [
      {"name":"AAHA 2023 건강한 시니어 평가","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/evaluating-the-healthy-senior-pet/"},
      {"name":"AAHA 시니어 검사 항목·빈도 표","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/diagnostic-tests-and-recommended-frequencies-for-senior-dogs-and-cats/"},
    ],
  },
  { // 7-9
    id: "s7-checkup-2", stage: 7, area: "checkup",
    title: "나이는 병이 아니에요",
    why: [
      "AAHA는 \"나이는 병이 아니다\"라고 해요. 나이 들며 생기는 변화 중엔 치료하거나 편하게 해 줄 수 있는 것이 많아요.",
      "보호자는 이런 변화를 피할 수 없는 노화로 여기기 쉬워요(AAHA).",
    ],
    how: [
      "\"나이 들어서\"라는 생각이 들면 한 번 적어 둬요.",
      "다음 검진 때 그 목록을 보여 줘요.",
      "물·밥·잠·걸음·배변 변화를 날짜와 함께 남겨요.",
    ],
    avoid: [
      "달라진 걸 그냥 넘기기.",
    ],
    ask: "\"이 변화가 나이 때문인지, 도울 방법이 있는지 봐 주세요.\"",
    sources: [
      {"name":"AAHA 2023 시니어 지침","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/"},
    ],
  },
  { // 7-10
    id: "s7-behavior-1", stage: 7, area: "behavior",
    title: "집에서 헤매거나 실수가 늘면 적어 두세요",
    why: [
      "8살 넘은 개의 약 14~22.5%가 나이와 관련된 인지 저하를 겪어요(AAHA).",
      "일찍 알아챌수록 관리 효과가 좋아요(AAHA).",
    ],
    how: [
      "이런 변화를 날짜와 함께 적어요(AAHA): 집에서 길 잃음, 가족 반응 줄어듦, 밤낮 바뀜, 배변 실수, 활동 변화, 불안 늘어남.",
      "구석에 끼어 못 나오거나 같은 곳을 맴도는지 봐요.",
      "갑자기 생겼다면 병원부터 가요. 통증·다른 병도 비슷하게 보여요(AAHA).",
    ],
    avoid: [
      "실수했다고 혼내기.",
      "\"치매니까 어쩔 수 없다\"고 단정하기.",
    ],
    ask: "\"이런 변화가 있어요(기록). 인지 검사를 받아 볼 수 있을까요?\"",
    sources: [
      {"name":"AAHA 2023 인지기능장애·불안 관리","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/managing-cognitive-dysfunction-and-behavioral-anxiety/"},
    ],
  },
  { // 7-11
    id: "s7-sleep-1", stage: 7, area: "sleep",
    title: "낮엔 자고 밤엔 서성인다면 기록해요",
    why: [
      "낮잠이 늘고 밤에 안절부절못하는 것은 인지 변화에서 가장 흔한 모습이에요(AAHA).",
      "통증·소변 문제로 밤에 깨기도 해요.",
    ],
    how: [
      "밤에 몇 번 깨는지, 몇 시쯤인지 일주일 적어요.",
      "낮에 짧은 산책·냄새 놀이로 깨어 있는 시간을 만들어요.",
      "잠자리는 조용하고 미끄럽지 않은 곳에 둬요.",
      "자기 전 배변을 한 번 더 시켜요.",
    ],
    avoid: [
      "사람 수면제·진정제 먹이기.",
    ],
    ask: "\"밤에 자꾸 깨서 돌아다녀요(기록). 도울 방법이 있을까요?\"",
    sources: [
      {"name":"AAHA 2023 인지기능장애·불안 관리","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/managing-cognitive-dysfunction-and-behavioral-anxiety/"},
    ],
  },
  { // 7-12
    id: "s7-checkup-3", stage: 7, area: "checkup",
    title: "잘 때 호흡수를 주 1번 적어요",
    why: [
      "잘 때 호흡수가 평소보다 늘면 심장 상태가 변했다는 신호일 수 있어요(코넬).",
      "쉬거나 잘 때 35회를 넘으면 바로 병원에 가요(코넬).",
    ],
    how: [
      "깊이 잘 때 15초 세고 ×4 해요(코넬).",
      "주 1번, 비슷한 시간에 재서 적어요.",
      "숨이 가쁘거나 기침이 늘면 함께 적어요.",
      "심장 진단을 받았다면 수의사 기준을 따라요.",
    ],
    avoid: [
      "덥거나 깨어 있을 때 잰 값을 기준으로 삼기.",
    ],
    ask: "\"잘 때 호흡수가 ○회예요. 괜찮은 범위인가요?\"",
    sources: [
      {"name":"코넬 Riney 센터 심잡음(호흡수)","url":"https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-information/get-jump-heart-murmurs"},
      {"name":"VCA 집에서 호흡수 재기","url":"https://vcahospitals.com/know-your-pet/home-breathing-rate-evaluation"},
    ],
  },
  { // 7-13
    id: "s7-season-1", stage: 7, area: "season",
    title: "더위엔 더 일찍 쉬게, 추위엔 따뜻하게",
    why: [
      "나이 든 개는 열사병 위험이 더 커요(코넬).",
      "추위에 약해지는 경우도 많아 산책 시간을 조절해요.",
    ],
    how: [
      "여름엔 해 뜬 직후·해 진 뒤에 짧게 걸어요.",
      "물과 그늘을 자주 챙겨요(코넬).",
      "겨울엔 옷을 입히고, 젖으면 바로 말려요.",
      "헐떡임이 심하면 바로 쉬어요.",
    ],
    avoid: [
      "차 안에 두기(코넬).",
      "덥거나 추운 날 평소만큼 걷기.",
    ],
    ask: "\"우리 아이는 하루 산책을 어느 정도가 적당할까요?\"",
    sources: [
      {"name":"코넬 Riney 센터 「Heatstroke」","url":"https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-information/heatstroke-medical-emergency"},
    ],
  },
  { // 7-14
    id: "s7-checkup-4", stage: 7, area: "checkup",
    title: "편안함을 지키는 돌봄도 미리 이야기해요",
    why: [
      "완화 돌봄은 통증과 증상을 덜어 주는 돌봄이에요. 치료와 함께 할 수 있어요(AAHA).",
      "AAHA는 보호자와 함께 일상 계획과 갑자기 나빠질 때의 계획을 세우라고 해요.",
    ],
    how: [
      "좋아하는 일(밥, 산책, 가족 곁)을 아직 즐기는지 주마다 적어요.",
      "아플 때 연락할 병원과 야간 병원을 정해 둬요.",
      "궁금한 점은 미리 수의사와 이야기해요.",
    ],
    avoid: [
      "혼자 고민하기. 가족·병원과 나눠요.",
    ],
    ask: "\"우리 아이가 편하게 지내려면 집에서 무엇을 해 주면 될까요?\"",
    sources: [
      {"name":"AAHA 2023 완화 돌봄·호스피스","url":"https://www.aaha.org/resources/2023-aaha-senior-care-guidelines-for-dogs-and-cats/palliative-care-or-hospice/"},
    ],
  },
];
// 시기 5~7은 뼈대만(주제 목록). 2단계에서 카드로 채운다.
export const LATER_STAGES = [
  { stage: 5, title: "성견", topics: [
    "하루 2번 유지와 체형 점수 4~5 지키기",
    "간식은 하루 열량 10% 미만",
    "사료 고르는 질문(회사·라벨)",
    "가정식·생식 주의",
    "날씬하면 오래 산다",
    "노즈워크로 한 끼 먹기",
    "장난감 단단함 테스트 다시 보기",
    "일주일마다 장난감 바꿔 주기",
    "새 개인기·두뇌 게임",
    "다른 개와 인사 예절",
    "펫티켓 법(2m·공용공간·인식표)",
    "겨울 제설제·저체온",
    "여름 더위·열사병",
    "진드기·SFTS",
    "1년 1~2번 정기 검진",
    "핵심백신 추가 간격(3년 이하)",
    "광견병 매년",
    "심장사상충 매년 검사",
    "연중 구충·변 검사 1년 2번 이상",
    "비만 점검",
    "보상 기반 유지",
    "짖음 원인별 대처",
    "분리불안",
    "갑작스러운 행동 변화는 병원 먼저",
    "매일 양치·잇몸병 예방",
    "정기 치과 검사·마취 스케일링",
    "목욕 주기",
    "발톱·귀·항문낭",
    "이중모 밀지 않기",
  ] },
  { stage: 6, title: "중년", topics: [
    "활동량 따라 급여량 다시 맞추기",
    "체중 감량은 주 1~2%",
    "물 마시는 양 변화 보기(100ml/kg)",
    "간식 열량 점검",
    "관절 부담 적은 두뇌 놀이로 비중 옮기기",
    "씹는 장난감 단단함 재점검(치아 마모)",
    "냄새 산책",
    "놀이 중 절뚝임 기록",
    "미끄럼·계단 줄이기",
    "체중 유지 운동",
    "날씨별 산책 조절",
    "하네스 유지(기관)",
    "혈액·소변 기초값 만들기",
    "혹 기록(위치·크기·날짜)",
    "잘 때 호흡수",
    "(중성화 안 한 암컷) 물 많이 마심·기운 없음 = 자궁 감염 신호",
    "중성화 암컷 요실금",
    "행동 변화 = 통증 신호일 수 있음",
    "소리 공포(천둥·불꽃)",
    "새 신호 배우기로 머리 쓰기",
    "혼자 있는 시간 점검",
    "치석·치주염 단계",
    "털이 안 자람·대칭 탈모",
    "귀 냄새·분비물",
    "발바닥·발톱",
  ] },
  { stage: 7, title: "노령", topics: [
    "노령기 영양 평가는 매 방문마다",
    "근육 줄어듦·체중 감소 확인",
    "물·소변 양 변화(신장·당뇨·쿠싱 신호)",
    "씹기 힘들 때(치아 통증)",
    "인지 자극 놀이",
    "부드러운 장난감으로 바꾸기",
    "짧은 노즈워크",
    "놀이 시간 짧게 나누기",
    "관절 통증 신호(눕고 일어나기 힘듦)",
    "집 안 환경 바꾸기(미끄럼·계단)",
    "추위에 더 약함",
    "유모차 산책",
    "검진 주기와 검사 항목",
    "\"나이는 병이 아니다\"",
    "인지기능장애 신호(밤낮 바뀜·실수·길 잃음)",
    "잘 때 호흡수(심장)",
    "완화·호스피스 돌봄 상담",
    "갑자기 생긴 실수·짖음은 병원 먼저",
    "쉬운 신호 복습으로 머리 쓰기",
    "수면 패턴 변화 기록",
    "불안 늘어남",
    "마취 전 검사와 치과 처치",
    "혹·피부 변화 매달 확인",
    "발톱이 덜 닳음(활동 감소)",
    "목욕 뒤 빨리 말리기(체온)",
  ] },
];
