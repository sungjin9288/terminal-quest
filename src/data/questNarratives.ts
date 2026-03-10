import {
  QuestCategory,
  QuestFatigueClass,
  type QuestNarrative
} from '../types/game.js';

interface QuestNarrativeOptions {
  id: string;
  name: string;
  description: string;
  questGiver: string;
  isMainQuest?: boolean;
  repeatable?: boolean;
  seasonalEventId?: string;
}

type NarrativeTemplate = Omit<QuestNarrative, 'category'> & {
  category?: QuestCategory;
};

const CHARACTER_STORY_QUEST_IDS = new Set<string>([
  'board-checkin',
  'merchant-network',
  'inn-consult',
  'supply-route-seal',
  'plains-logistics-sweep',
  'registry-anomaly-catalog',
  'thread-rescue-protocol',
  'heap-fragment-quarantine',
  'network-fallback-lab',
  'kernel-audit-drill',
  'postcore-stability-route'
]);

function contract(
  arcId: string,
  arcTitle: string,
  chapterLabel: string,
  featuredNpc: string,
  storyBeat: string,
  hook: string,
  fatigueClass: QuestFatigueClass = QuestFatigueClass.Short
): NarrativeTemplate {
  return {
    category: QuestCategory.Contract,
    arcId,
    arcTitle,
    chapterLabel,
    featuredNpc,
    storyBeat,
    hook,
    fatigueClass
  };
}

function character(
  arcId: string,
  arcTitle: string,
  chapterLabel: string,
  featuredNpc: string,
  storyBeat: string,
  hook: string,
  fatigueClass: QuestFatigueClass = QuestFatigueClass.Medium
): NarrativeTemplate {
  return {
    category: QuestCategory.CharacterStory,
    arcId,
    arcTitle,
    chapterLabel,
    featuredNpc,
    storyBeat,
    hook,
    fatigueClass
  };
}

function mainStory(
  arcId: string,
  arcTitle: string,
  chapterLabel: string,
  featuredNpc: string,
  storyBeat: string,
  hook: string,
  fatigueClass: QuestFatigueClass = QuestFatigueClass.Long
): NarrativeTemplate {
  return {
    category: QuestCategory.MainStory,
    arcId,
    arcTitle,
    chapterLabel,
    featuredNpc,
    storyBeat,
    hook,
    fatigueClass
  };
}

function seasonal(
  arcId: string,
  arcTitle: string,
  chapterLabel: string,
  featuredNpc: string,
  storyBeat: string,
  hook: string
): NarrativeTemplate {
  return {
    category: QuestCategory.Seasonal,
    arcId,
    arcTitle,
    chapterLabel,
    featuredNpc,
    storyBeat,
    hook,
    fatigueClass: QuestFatigueClass.Short
  };
}

const QUEST_NARRATIVE_BY_ID: Record<string, NarrativeTemplate> = {
  'slime-cleanup': contract(
    'first-sortie',
    '첫 출동',
    '1장. 외곽 안정화',
    '게시판 담당관',
    '마을 바깥의 작은 오류를 수습하며 모험가로서 첫 신뢰를 얻습니다.',
    '외곽 슬라임부터 정리해 주세요. 첫 출동 기록은 제가 직접 올리겠습니다.'
  ),
  'forest-survey': contract(
    'first-sortie',
    '첫 출동',
    '2장. 숲 입구 보고',
    '현장 기록관',
    '메모리 숲의 분위기를 직접 확인하고 첫 현장 보고를 올립니다.',
    '숲 입구까지만 확인하고 돌아오세요. 눈으로 본 첫 현장 보고가 필요합니다.'
  ),
  'ghost-debugging': contract(
    'first-sortie',
    '첫 출동',
    '3장. 첫 현상금',
    '경계 순찰대',
    '숲의 불안을 키우는 404 고스트를 정리하며 초반 리듬을 익힙니다.',
    '404 고스트를 줄여 주십시오. 순찰선이 밤을 버틸 틈이 필요합니다.',
    QuestFatigueClass.Medium
  ),
  'potion-supply': contract(
    'first-sortie',
    '첫 출동',
    '보급. 생존 준비',
    '비트 타운 물자반',
    '탐험 전에 필요한 기본 소모품 수급 감각을 익히게 합니다.',
    '체력 포션 두 병은 꼭 확보해 두세요. 살아 돌아와야 다음 출동도 있습니다.'
  ),
  'board-checkin': character(
    'town-support-line',
    '비트 타운 지원선',
    '1장. 등록 절차',
    '게시판 담당관',
    '플레이어가 시스템의 외부인이 아니라 공식 모험가로 편입됩니다.',
    '등록만 마치면 정식 오퍼레이터 권한이 열립니다. 절차를 끝냅시다.',
    QuestFatigueClass.Short
  ),
  'merchant-network': character(
    'town-support-line',
    '비트 타운 지원선',
    '2장. 상점 거리 연결',
    '장비상',
    '상인 네트워크를 통해 전선 뒤편에도 사람이 움직이고 있음을 보여줍니다.',
    '상점 거리 인물들과 얼굴을 익혀 두세요. 전선이 길어지면 저 사람들이 숨통입니다.',
    QuestFatigueClass.Short
  ),
  'inn-consult': character(
    'town-support-line',
    '비트 타운 지원선',
    '3장. 휴식 규율',
    '여관 주인',
    '전투와 휴식의 템포를 이야기적으로 정당화합니다.',
    '지치기 전에 쉬는 법부터 익히세요. 오래 버티는 쪽이 결국 이깁니다.',
    QuestFatigueClass.Short
  ),
  'memory-crow-cull': contract(
    'frontier-patrol',
    '전초 확장',
    '1장. 숲 청소',
    '숲 순찰대',
    '메모리 숲의 위협 밀도를 낮추며 다음 지역 확장을 위한 발판을 만듭니다.',
    '숲 외곽을 다시 훑어 주세요. 까마귀와 벌 떼를 그냥 두면 다음 보급이 끊깁니다.',
    QuestFatigueClass.Medium
  ),
  'cache-entry-scout': contract(
    'frontier-patrol',
    '전초 확장',
    '2장. 동굴 입구 확인',
    '정찰 담당관',
    '새로운 던전 진입 전 분위기와 위험도를 미리 확인합니다.',
    '동굴 입구만 먼저 보고 오십시오. 안으로 밀어 넣기 전에 길부터 알아야 합니다.'
  ),
  'cache-bat-extermination': contract(
    'frontier-patrol',
    '전초 확장',
    '3장. 동굴 통로 확보',
    '광맥 조사반',
    '캐시 동굴 내부의 방해 개체를 치우며 본격 탐험 통로를 엽니다.',
    '박쥐와 버퍼 웜부터 치워 주세요. 통로만 열리면 조사반을 바로 넣겠습니다.',
    QuestFatigueClass.Medium
  ),
  'crystal-sample-collection': contract(
    'frontier-patrol',
    '전초 확장',
    '4장. 연구 샘플 확보',
    '현장 연구원',
    '전투 결과물이 연구 자산으로 전환되면서 세계의 폭이 넓어집니다.',
    '전투 흔적만 남기지 말고 샘플도 회수해 주세요. 다음 공략 자료로 쓰겠습니다.',
    QuestFatigueClass.Medium
  ),
  'supply-route-seal': character(
    'town-support-line',
    '비트 타운 지원선',
    '4장. 보급선 구축',
    '상인과 여관 연합',
    '마을의 핵심 인물들이 한 번에 연결되며 플레이어가 지원선의 중심에 섭니다.',
    '보급선을 한 번에 묶어야 합니다. 상인과 여관 쪽 준비 상황을 직접 확인해 주세요.'
  ),
  'plains-recon': contract(
    'plains-offensive',
    '평원 진출',
    '1장. 첫 전초선',
    '전초 관제관',
    '비트 평원으로 진출하며 초반 생존전이 넓은 전장으로 확장됩니다.',
    '평원 전초선부터 확인해 주세요. 시야와 적 움직임을 먼저 잡아야 다음 병력을 넣을 수 있습니다.',
    QuestFatigueClass.Medium
  ),
  'wyvern-hunt': contract(
    'plains-offensive',
    '평원 진출',
    '2장. 공중 위협 추적',
    '평원 감시대',
    '평원의 상징적인 위협을 정리해 진출 성공을 체감하게 합니다.',
    '와이번 추적선이 끊겼습니다. 공중 위협부터 줄여야 평원 보급로가 버팁니다.',
    QuestFatigueClass.Medium
  ),
  'plains-signal-triangulation': contract(
    'plains-offensive',
    '평원 진출',
    '보조. 신호 삼각측량',
    '지도 분석관',
    '지형 이해와 사냥을 엮어 평원 공략의 밀도를 높입니다.',
    '전초 신호를 다시 물려 주세요. 좌표만 복구되면 평원 지도가 훨씬 또렷해집니다.',
    QuestFatigueClass.Medium
  ),
  'plains-logistics-sweep': character(
    'plains-offensive',
    '평원 진출',
    '보조. 보급선 회복',
    '장비상',
    '평원의 전투가 마을 경제와 직접 연결된다는 점을 보여줍니다.',
    '평원 쪽에서 보급 마차가 계속 끊깁니다. 방해 개체를 정리하고 복구 보고까지 가져와 주세요.',
    QuestFatigueClass.Medium
  ),
  'registry-briefing': mainStory(
    'registry-crisis',
    '레지스트리 위기',
    '1장. 공식 작전 개시',
    '레지스트리 브리퍼',
    '비트 타운의 현장 계약들이 정식 시스템 복구 작전으로 격상됩니다.',
    '이제 현장 의뢰가 아닙니다. 정식 복구 작전으로 전환하니 브리핑부터 받고 움직이십시오.'
  ),
  'security-hardening': mainStory(
    'registry-crisis',
    '레지스트리 위기',
    '2장. 보안 루트 확보',
    '보안 통제관',
    '세 개 분기 중 하나를 먼저 밀어 전장 주도권을 잡습니다.',
    '보안 루트부터 밀겠습니다. 권한선이 열려야 이후 침투가 훨씬 수월해집니다.',
  ),
  'recovery-protocol': mainStory(
    'registry-crisis',
    '레지스트리 위기',
    '2장. 복구 루트 확보',
    '복구 오퍼레이터',
    '재시작 라인을 살려 장기전을 버틸 기반을 마련합니다.',
    '재시작 라인을 되살려 주세요. 복구선이 살아 있어야 우리도 길게 버틸 수 있습니다.'
  ),
  'key-phantom-pursuit': mainStory(
    'registry-crisis',
    '레지스트리 위기',
    '2장. 접근 권한 회수',
    '열쇠 추적반',
    '핵심 키를 빼앗긴 상태를 뒤집기 위한 추격전입니다.',
    '팬텀 군이 핵심 키를 들고 달아났습니다. 추적해서 접근 권한을 반드시 되찾아 오세요.'
  ),
  'registry-anomaly-catalog': character(
    'registry-crisis',
    '레지스트리 위기',
    '보조. 이상군 기록',
    '현장 분석가',
    '다음 분기 공략을 위한 정보 채집으로 지원팀의 존재감을 키웁니다.',
    '이상 개체 분포를 기록해 주세요. 다음 분기 투입표를 짜려면 현장 데이터가 더 필요합니다.'
  ),
  'swap-swamp-expedition': mainStory(
    'branch-convergence',
    '분기 수렴 전선',
    'A-2. 스왑 늪지 강행',
    '보안 통제관',
    '보안 경로를 타고 첫 분기 후속 지역을 밀어냅니다.',
    '보안선이 늪지 쪽에서 막혔습니다. 스왑 늪지를 밀어내고 다음 진입축을 확보해 주세요.'
  ),
  'thread-forest-sync': mainStory(
    'branch-convergence',
    '분기 수렴 전선',
    'B-2. 스레드 숲 동기화',
    '복구 오퍼레이터',
    '비동기 혼선을 정리하며 분기별 전장 분위기를 확실히 구분합니다.',
    '스레드 숲이 계속 엇갈립니다. 교착 지점부터 끊어 내고 흐름을 다시 맞춰 주십시오.'
  ),
  'thread-rescue-protocol': character(
    'branch-convergence',
    '분기 수렴 전선',
    '보조. 구조 라인 회수',
    '지원 신호 담당',
    '전장 속에서 실제 구조 작업이 벌어지고 있음을 보여줍니다.',
    '구조 신호가 아직 살아 있습니다. 고립 인원을 회수할 수 있게 길부터 다시 열어 주세요.'
  ),
  'stack-mountain-watch': mainStory(
    'branch-convergence',
    '분기 수렴 전선',
    'C-2. 과부하 감시선',
    '고지 정찰반',
    '스택 산맥의 과부하 원인을 끊어 세 번째 분기 축을 완성합니다.',
    '고지 쪽 과부하가 심상치 않습니다. 산맥 정찰선을 지키며 원인을 직접 끊어내야 합니다.'
  ),
  'branch-convergence-report': mainStory(
    'branch-convergence',
    '분기 수렴 전선',
    '합류. 통합 보고',
    '게시판 담당관',
    '세 갈래 전선의 결과를 하나로 엮어 다음 막의 진입 자격을 얻습니다.',
    '각 전선 결과를 한 장의 보고로 묶겠습니다. 빠진 구간 없이 정리해 다음 작전 승인을 받읍시다.',
    QuestFatigueClass.Medium
  ),
  'heap-cave-expedition': mainStory(
    'memory-collapse',
    '메모리 붕괴 추적',
    '1장. 힙 동굴 하강',
    '침투 선도반',
    '오염의 근원을 더 직접적으로 추적하며 중후반 분위기로 넘어갑니다.',
    '오염 근원이 힙 동굴 아래로 내려갔습니다. 긴 탐사가 될 테니 보급을 갖추고 내려가세요.'
  ),
  'pointer-sanitization': mainStory(
    'memory-collapse',
    '메모리 붕괴 추적',
    '2장. 포인터 정화',
    '오염 정화반',
    '메모리 붕괴의 핵심 원인을 잘라내며 스토리의 위협 수위를 끌어올립니다.',
    '댕글링 포인터 군집을 그대로 두면 붕괴가 번집니다. 오염 구역째 잘라낸다고 생각하고 움직이세요.'
  ),
  'heap-fragment-quarantine': character(
    'memory-collapse',
    '메모리 붕괴 추적',
    '보조. 파편 격리',
    '현장 격리팀',
    '붕괴 여파를 주민 구역까지 번지지 않게 막는 후속 대응입니다.',
    '붕괴 파편이 민가 쪽으로 새고 있습니다. 주력 전선보다 먼저 격리선부터 세워 주세요.'
  ),
  'network-layer-mapping': mainStory(
    'signal-war',
    '네트워크 전면전',
    '1장. 계층 진입',
    '네트워크 분석관',
    '전장을 물리 공간에서 통신 구조로 확장해 후반부 스케일을 키웁니다.',
    '네트워크 계층 지도를 다시 그려야 합니다. 길을 알아야 후속 공격도 제자리를 찾습니다.'
  ),
  'firewall-stress-test': mainStory(
    'signal-war',
    '네트워크 전면전',
    '2장. 방화벽 압박',
    '공격 오퍼레이터',
    '정면 돌파형 분기를 통해 방화벽 한계를 시험합니다.',
    '방화벽을 정면에서 흔들겠습니다. 버티는 한계치를 직접 확인해 균열을 만들어 주세요.'
  ),
  'protocol-audit': mainStory(
    'signal-war',
    '네트워크 전면전',
    '2장. 프로토콜 감사',
    '무결성 감사관',
    '은폐된 통신 노드를 걷어내며 네트워크 전장의 또 다른 면을 드러냅니다.',
    '숨은 통신 노드가 전부 오염 경로입니다. 감사선을 따라가며 은폐 구간을 드러내 주세요.'
  ),
  'network-fallback-lab': character(
    'signal-war',
    '네트워크 전면전',
    '보조. 우회 실험',
    '백업 통신 연구원',
    '전면전 실패 시에도 이어질 백업선을 준비하는 지원 임무입니다.',
    '정면 공세가 막혀도 끊기지 않게 우회선을 시험합니다. 실험 경로 확보를 도와 주세요.'
  ),
  'kernel-fortress-scout': mainStory(
    'kernel-siege',
    '커널 공성전',
    '1장. 요새 정찰',
    '공성 지휘관',
    '네트워크 분기의 성과를 합쳐 커널 요새라는 후반 핵심 무대에 진입합니다.',
    '커널 요새는 정면으로만 못 뚫습니다. 외벽 구조와 순찰 패턴부터 정찰해 와 주세요.'
  ),
  'kernel-audit-drill': character(
    'kernel-siege',
    '커널 공성전',
    '보조. 비상 절차 점검',
    '커널 감사반',
    '최종 침투 전 긴장을 잠시 눌러 주는 사전 점검 에피소드입니다.',
    '침투 전에 비상 절차부터 점검합니다. 작은 누락 하나가 공성 전체를 망칠 수 있습니다.'
  ),
  'root-directory-breach': mainStory(
    'root-breach',
    '루트 침투',
    '1장. 최종 권한선 붕괴',
    '침투 선도반',
    '시스템 최심부로 향하는 문이 열리며 마지막 막이 시작됩니다.',
    '루트 진입문이 열렸습니다. 지금부터는 권한선을 직접 부수며 들어갑니다.'
  ),
  'privilege-purge': mainStory(
    'root-breach',
    '루트 침투',
    '2장. 권한층 정화',
    '권한 관리관',
    '남은 지배 개체를 정리하며 루트 접근권을 탈환합니다.',
    '권한층에 남은 지배 개체를 전부 걷어내야 합니다. 접근권은 여기서 완전히 되찾습니다.'
  ),
  'boot-sequence-stabilization': mainStory(
    'root-breach',
    '루트 침투',
    '2장. 부트 체인 안정화',
    '부트 엔지니어',
    '재시작 루프를 붙잡아 시스템 붕괴 시간을 늦춥니다.',
    '부트 체인이 흔들리면 결전 도중 시스템이 꺼집니다. 재시작 루프부터 묶어 두세요.'
  ),
  'corruption-space-entry': mainStory(
    'final-descent',
    '오염 심층 강하',
    '1장. 오염 공간 개방',
    '최종 공략 지휘관',
    '최후의 오염 구역이 드러나며 결말 직전의 분위기를 만듭니다.',
    '최후 구역 입구가 열렸습니다. 남은 목표는 하나뿐이니 장비를 정리하고 바로 강하합시다.'
  ),
  'final-purge': mainStory(
    'final-descent',
    '오염 심층 강하',
    '2장. 코어 정화',
    '최종 공략 지휘관',
    '예외 체인의 심장을 끊어 시스템 전체를 구하는 결말 임무입니다.',
    '오염 코어를 여기서 끝냅니다. 지금까지 모은 모든 준비를 마지막 한 번에 쏟아부으세요.'
  ),
  'postcore-stability-route': character(
    'postcore-recovery',
    '포스트코어 안정화',
    '에필로그. 잔류 루트 정리',
    '안정화 감독관',
    '엔딩 이후에도 남은 여진을 정리하며 세계가 회복되는 모습을 보여줍니다.',
    '끝난 전투도 정리가 필요합니다. 잔류 오염 루트를 닫고 회복선을 완성해 주세요.',
    QuestFatigueClass.Medium
  ),
  'spring-memory-festival-sweep': seasonal(
    'seasonal-ops',
    '시즌 현장 의뢰',
    '봄. 메모리 페스티벌',
    '시즌 진행 요원',
    '행사 기간의 혼선을 정리하며 가벼운 후속 플레이를 제공합니다.',
    '축제 구역 주변 오염만 빠르게 쓸어 주세요. 행사 동선이 막히기 전에 정리해야 합니다.'
  ),
  'summer-overclock-rush-suppression': seasonal(
    'seasonal-ops',
    '시즌 현장 의뢰',
    '여름. 오버클럭 러시',
    '시즌 진행 요원',
    '폭주한 전선을 진압하며 짧은 난전 세션을 제공합니다.',
    '과열 전선이 다시 폭주했습니다. 짧게라도 화력을 몰아 넣어 온도를 내려 주세요.'
  ),
  'autumn-harvest-hunt-pipeline': seasonal(
    'seasonal-ops',
    '시즌 현장 의뢰',
    '가을. 수확 파이프라인',
    '시즌 진행 요원',
    '회수 자원 정리에 집중하는 시즌 임무로 템포를 바꿉니다.',
    '회수 파이프라인이 막히기 전에 자원을 모아 납품해 주세요. 손실만 막아도 충분합니다.'
  ),
  'winter-hardening-drive-frontline': seasonal(
    'seasonal-ops',
    '시즌 현장 의뢰',
    '겨울. 하드닝 전선',
    '시즌 진행 요원',
    '혹한기 방어선을 유지하는 보조 전선으로 시즌 긴장을 유지합니다.',
    '겨울 방어선이 차갑게 굳기 전에 보강이 필요합니다. 핵심 물약과 전선을 함께 지켜 주세요.'
  )
};

const QUEST_NPC_LINE_BY_ID: Record<string, string> = {
  'slime-cleanup': '첫 출동입니다. 큰 전투는 아니지만 기록은 첫 임무부터 남습니다.',
  'forest-survey': '입구의 냄새와 소음까지 적어 오세요. 숫자보다 현장감이 먼저입니다.',
  'ghost-debugging': '오늘 밤 순찰선이 버티려면 고스트 수부터 줄어야 합니다.',
  'potion-supply': '포션 두 병은 보험이 아닙니다. 그게 오늘 생존선입니다.',
  'board-checkin': '서명만 끝나면 당신도 우리 전선의 정식 오퍼레이터입니다.',
  'merchant-network': '장비는 검만 파는 게 아닙니다. 돌아올 길도 같이 파는 겁니다.',
  'inn-consult': '쉬는 타이밍을 모르면 강한 사람도 오래 못 갑니다.',
  'memory-crow-cull': '숲이 조용해져야 다음 보급대가 들어갑니다. 소리부터 줄여 주세요.',
  'cache-entry-scout': '깊이 들어가진 마십시오. 오늘은 길을 확인하는 게 전부입니다.',
  'cache-bat-extermination': '통로만 열리면 조사반은 바로 움직입니다. 길부터 비워 주세요.',
  'crystal-sample-collection': '깨뜨린 흔적만 남기지 말고 쓸 만한 조각은 꼭 챙겨 오세요.',
  'supply-route-seal': '상점과 여관이 이어져야 전선도 이어집니다. 연결 상태를 직접 보고해 주세요.',
  'plains-recon': '평원은 숲보다 넓고 숨을 데가 없습니다. 첫 시야부터 잡고 오세요.',
  'wyvern-hunt': '놈들이 하늘을 잡고 있는 한 보급 마차는 못 지나갑니다.',
  'plains-signal-triangulation': '신호 세 점만 되살리면 평원 지도가 다시 살아납니다.',
  'plains-logistics-sweep': '전선에서 잃는 한 수레가 마을에선 하루치 숨통입니다.',
  'registry-briefing': '현장 계약은 끝났습니다. 지금부터는 정식 작전으로 움직입니다.',
  'security-hardening': '보안선만 열리면 우리 쪽 손실이 절반으로 줄어듭니다.',
  'recovery-protocol': '재시작 루프를 살려 두십시오. 무너져도 다시 일어설 선이 필요합니다.',
  'key-phantom-pursuit': '핵심 키를 놓치면 다음 문은 영영 안 열립니다. 반드시 쫓아가세요.',
  'registry-anomaly-catalog': '눈에 띄는 이상은 전부 적어 오세요. 다음 투입표가 거기서 갈립니다.',
  'swap-swamp-expedition': '늪지가 막히면 보안선 전체가 늦어집니다. 오늘 안에 길을 내야 합니다.',
  'thread-forest-sync': '엇갈린 흐름만 바로잡아도 숲 전체가 숨을 쉽니다.',
  'thread-rescue-protocol': '구조 신호가 아직 살아 있습니다. 늦으면 목소리부터 끊깁니다.',
  'stack-mountain-watch': '산맥 감시선이 무너지면 세 번째 축도 같이 무너집니다.',
  'branch-convergence-report': '세 갈래 전선을 하나로 묶어야 다음 승인 도장이 찍힙니다.',
  'heap-cave-expedition': '내려갈수록 냄새가 달라질 겁니다. 근원이 가까워졌다는 뜻입니다.',
  'pointer-sanitization': '오염 포인터는 하나만 남겨도 다시 번집니다. 남김없이 지워 주세요.',
  'heap-fragment-quarantine': '파편이 민가 쪽으로 새면 전선 밖도 전장이 됩니다.',
  'network-layer-mapping': '지도 없이 들어가면 우리는 길을 잃고 적은 길을 기억합니다.',
  'firewall-stress-test': '버티는 한계를 눈으로 봐야 어디를 찢을지 결정할 수 있습니다.',
  'protocol-audit': '숨은 노드는 대개 더러운 길입니다. 보이면 바로 드러내 주세요.',
  'network-fallback-lab': '정면이 막히는 건 괜찮습니다. 우회선까지 막히는 건 안 됩니다.',
  'kernel-fortress-scout': '요새는 겁먹을 만합니다. 그래서 더 먼저 구조를 알아야 합니다.',
  'kernel-audit-drill': '본 침투 전에 실수가 나와야 합니다. 결전 중엔 너무 늦습니다.',
  'root-directory-breach': '이제는 숨길 권한선도 얼마 남지 않았습니다. 밀고 들어갑시다.',
  'privilege-purge': '지배 개체를 남겨 두면 루트는 다시 잠깁니다. 전부 걷어내세요.',
  'boot-sequence-stabilization': '부트 체인이 끊기면 우리가 이겨도 시스템이 못 버팁니다.',
  'corruption-space-entry': '남은 목표는 하나입니다. 여기서부터는 망설임이 손실입니다.',
  'final-purge': '끝낼 때가 왔습니다. 이번 한 번에 코어를 멈춥니다.',
  'postcore-stability-route': '전투가 끝나도 복구는 끝나지 않았습니다. 마지막 여진까지 묶어 둡시다.',
  'spring-memory-festival-sweep': '축제 동선만 살려 주시면 나머지 정리는 저희가 맡겠습니다.',
  'summer-overclock-rush-suppression': '과열이 다시 치솟고 있습니다. 짧게라도 화력을 집중해 주세요.',
  'autumn-harvest-hunt-pipeline': '수확분만 제시간에 넘기면 이번 시즌은 손실 없이 끝낼 수 있습니다.',
  'winter-hardening-drive-frontline': '겨울 전선은 한 번 얼면 다시 세우기 어렵습니다. 지금 버텨야 합니다.'
};

function inferQuestCategory(options: QuestNarrativeOptions): QuestCategory {
  if (options.repeatable || options.seasonalEventId) {
    return QuestCategory.Seasonal;
  }
  if (options.isMainQuest) {
    return QuestCategory.MainStory;
  }
  if (CHARACTER_STORY_QUEST_IDS.has(options.id)) {
    return QuestCategory.CharacterStory;
  }
  return QuestCategory.Contract;
}

function inferFatigueClass(category: QuestCategory, options: QuestNarrativeOptions): QuestFatigueClass {
  if (category === QuestCategory.Seasonal) {
    return QuestFatigueClass.Short;
  }
  if (category === QuestCategory.MainStory) {
    return options.description.includes('최종') || options.description.includes('종결')
      ? QuestFatigueClass.Long
      : QuestFatigueClass.Medium;
  }
  if (category === QuestCategory.CharacterStory) {
    return QuestFatigueClass.Medium;
  }
  return QuestFatigueClass.Short;
}

export function buildQuestNarrative(options: QuestNarrativeOptions): QuestNarrative {
  const override = QUEST_NARRATIVE_BY_ID[options.id];
  const category = override?.category ?? inferQuestCategory(options);
  const featuredNpc = override?.featuredNpc ?? options.questGiver;

  return {
    category,
    arcId: override?.arcId ?? `${category}-arc`,
    arcTitle: override?.arcTitle ?? '현장 의뢰',
    chapterLabel: override?.chapterLabel ?? options.name,
    featuredNpc,
    npcLine: QUEST_NPC_LINE_BY_ID[options.id],
    storyBeat: override?.storyBeat ?? options.description,
    hook: override?.hook ?? '다음 전선으로 넘어가기 전 필요한 현장 브리핑입니다. 준비를 마치고 출동하세요.',
    fatigueClass: override?.fatigueClass ?? inferFatigueClass(category, options)
  };
}
