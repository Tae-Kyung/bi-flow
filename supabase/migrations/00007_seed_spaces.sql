-- ============================================
-- 시드 데이터: 기관별 공간 + 입주기업(확장필드) + 계약
-- ============================================

-- ============================================
-- 1. 창업보육센터 (bi_center) — 3층 건물, 총 15실
-- ============================================
INSERT INTO spaces (org_id, name, area, status, floor, description)
SELECT o.id, s.name, s.area, s.status::space_status, s.floor, s.description
FROM organizations o,
(VALUES
  ('101호', 33.06, 'occupied', '1F', '1인 창업실'),
  ('102호', 33.06, 'occupied', '1F', '1인 창업실'),
  ('103호', 49.59, 'occupied', '1F', '2인 창업실'),
  ('104호', 49.59, 'vacant',   '1F', '2인 창업실'),
  ('105호', 66.12, 'vacant',   '1F', '소규모 사무실'),
  ('201호', 33.06, 'occupied', '2F', '1인 창업실'),
  ('202호', 33.06, 'occupied', '2F', '1인 창업실'),
  ('203호', 49.59, 'occupied', '2F', '2인 창업실'),
  ('204호', 66.12, 'occupied', '2F', '소규모 사무실'),
  ('205호', 82.65, 'vacant',   '2F', '중규모 사무실'),
  ('301호', 49.59, 'occupied', '3F', '2인 창업실'),
  ('302호', 49.59, 'occupied', '3F', '2인 창업실'),
  ('303호', 82.65, 'occupied', '3F', '중규모 사무실'),
  ('304호', 99.18, 'vacant',   '3F', '대규모 사무실'),
  ('305호', 132.24,'vacant',   '3F', '회의실 겸 사무실')
) AS s(name, area, status, floor, description)
WHERE o.type = 'bi_center';

-- 창업보육센터 입주기업 (occupied 10실 → 10개 기업)
INSERT INTO companies (
  org_id, name, biz_number, representative, phone, email, status,
  corporate_type, founding_date, business_description, main_products, website,
  contact_name, contact_phone, contact_email, office_phone, fax,
  certification_expiry, notes
)
SELECT o.id,
  c.name, c.biz_number, c.representative, c.phone, c.email, 'active'::company_status,
  c.corporate_type, c.founding_date::date, c.biz_desc, c.main_products, c.website,
  c.contact_name, c.contact_phone, c.contact_email, c.office_phone, c.fax,
  c.cert_expiry::date, c.notes
FROM organizations o,
(VALUES
  ('(주)테크스타트',   '101-01-00001', '김민수', '010-1111-0001', 'techstart@example.com',
   'corporation', '2020-03-15', 'SW개발 / 모바일앱', 'AI 고객분석 솔루션', 'https://techstart.example.com',
   '이수정', '010-1111-1001', 'admin@techstart.example.com', '055-111-0001', '055-111-0002',
   '2026-08-31', '벤처기업 인증'),
  ('(주)코드랩',      '101-01-00002', '이서준', '010-1111-0002', 'codelab@example.com',
   'corporation', '2021-07-01', 'SW개발 / 웹서비스', 'SaaS 프로젝트관리 툴', 'https://codelab.example.com',
   '김하나', '010-1111-1002', 'admin@codelab.example.com', '055-111-0003', NULL,
   '2026-12-15', NULL),
  ('아이디어팜',       '101-01-00003', '박지영', '010-1111-0003', 'ideafarm@example.com',
   'individual', '2022-01-10', '디자인 / UX컨설팅', 'UX 리서치 서비스', NULL,
   NULL, NULL, NULL, NULL, NULL,
   NULL, '1인 창업'),
  ('(주)스마트링크',   '101-01-00004', '최현우', '010-1111-0004', 'smartlink@example.com',
   'corporation', '2019-11-20', 'IoT / 하드웨어', '스마트홈 게이트웨이', 'https://smartlink.example.com',
   '정다은', '010-1111-1004', 'biz@smartlink.example.com', '055-111-0007', '055-111-0008',
   '2025-06-30', '벤처기업 인증, 특허 3건'),
  ('(주)데이터브릿지', '101-01-00005', '정수빈', '010-1111-0005', 'databridge@example.com',
   'corporation', '2021-04-05', '데이터분석 / BI', '데이터 시각화 플랫폼', 'https://databridge.example.com',
   '오민수', '010-1111-1005', 'tax@databridge.example.com', '055-111-0009', NULL,
   '2026-03-20', NULL),
  ('앱포유',           '101-01-00006', '한예진', '010-1111-0006', 'appforyou@example.com',
   'individual', '2023-06-01', 'SW개발 / 모바일앱', '소상공인 예약앱', NULL,
   NULL, NULL, NULL, NULL, NULL,
   NULL, '예비창업 → 개인사업자 전환'),
  ('(주)클라우드나인', '101-01-00007', '오승현', '010-1111-0007', 'cloud9@example.com',
   'corporation', '2020-09-12', '클라우드 / 인프라', '클라우드 모니터링 SaaS', 'https://cloud9.example.com',
   '배서현', '010-1111-1007', 'admin@cloud9.example.com', '055-111-0013', '055-111-0014',
   '2026-09-30', '벤처기업 인증'),
  ('(주)그린에너지',   '101-01-00008', '윤도현', '010-1111-0008', 'greenenergy@example.com',
   'corporation', '2018-05-20', '신재생에너지 / ESS', 'ESS 관제 시스템', 'https://greenenergy.example.com',
   '김태리', '010-1111-1008', 'biz@greenenergy.example.com', '055-111-0015', '055-111-0016',
   '2025-11-30', '소상공인 확인서'),
  ('(주)넥스트웨어',   '101-01-00009', '강민지', '010-1111-0009', 'nextware@example.com',
   'corporation', '2022-08-15', 'SW개발 / ERP', '중소기업 ERP 솔루션', 'https://nextware.example.com',
   '이준호', '010-1111-1009', 'tax@nextware.example.com', '055-111-0017', NULL,
   '2027-02-28', '벤처기업 인증'),
  ('(주)로보틱스원',   '101-01-00010', '배준혁', '010-1111-0010', 'robotics1@example.com',
   'corporation', '2021-02-01', '로봇 / 자동화', '산업용 협동로봇 SW', 'https://robotics1.example.com',
   '송유진', '010-1111-1010', 'admin@robotics1.example.com', '055-111-0019', '055-111-0020',
   '2026-07-15', '특허 5건 보유')
) AS c(name, biz_number, representative, phone, email,
       corporate_type, founding_date, biz_desc, main_products, website,
       contact_name, contact_phone, contact_email, office_phone, fax,
       cert_expiry, notes)
WHERE o.type = 'bi_center';

-- 창업보육센터 계약 (기업 ↔ 공간 매핑)
INSERT INTO contracts (company_id, space_id, org_id, start_date, end_date, rent_amount, deposit, status)
SELECT
  comp.id, sp.id, comp.org_id,
  '2025-03-01'::date, '2026-02-28'::date,
  (sp.area * 15000)::numeric(12,0),
  (sp.area * 15000 * 3)::numeric(12,0),
  'active'::contract_status
FROM (
  SELECT id, org_id, name, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM companies WHERE org_id = (SELECT id FROM organizations WHERE type = 'bi_center')
) comp
JOIN (
  SELECT id, area, name, ROW_NUMBER() OVER (ORDER BY name) AS rn
  FROM spaces WHERE org_id = (SELECT id FROM organizations WHERE type = 'bi_center') AND status = 'occupied'
) sp ON comp.rn = sp.rn;


-- ============================================
-- 2. G-테크벤처센터 (g_tech) — 5층 건물, 총 12실
-- ============================================
INSERT INTO spaces (org_id, name, area, status, floor, description)
SELECT o.id, s.name, s.area, s.status::space_status, s.floor, s.description
FROM organizations o,
(VALUES
  ('G-201', 42.98, 'occupied', '2F', '스타트업 오피스'),
  ('G-202', 42.98, 'occupied', '2F', '스타트업 오피스'),
  ('G-203', 59.50, 'vacant',   '2F', '중형 오피스'),
  ('G-301', 42.98, 'occupied', '3F', '스타트업 오피스'),
  ('G-302', 59.50, 'occupied', '3F', '중형 오피스'),
  ('G-303', 85.96, 'occupied', '3F', '대형 오피스'),
  ('G-401', 42.98, 'occupied', '4F', '스타트업 오피스'),
  ('G-402', 59.50, 'vacant',   '4F', '중형 오피스'),
  ('G-403', 85.96, 'vacant',   '4F', '대형 오피스'),
  ('G-501', 59.50, 'occupied', '5F', '중형 오피스'),
  ('G-502', 85.96, 'occupied', '5F', '대형 오피스'),
  ('G-503', 119.01,'vacant',   '5F', '프리미엄 오피스')
) AS s(name, area, status, floor, description)
WHERE o.type = 'g_tech';

-- G-테크벤처센터 입주기업 (occupied 8실 → 8개 기업)
INSERT INTO companies (
  org_id, name, biz_number, representative, phone, email, status,
  corporate_type, founding_date, business_description, main_products, website,
  contact_name, contact_phone, contact_email, office_phone, fax,
  certification_expiry, notes
)
SELECT o.id,
  c.name, c.biz_number, c.representative, c.phone, c.email, 'active'::company_status,
  c.corporate_type, c.founding_date::date, c.biz_desc, c.main_products, c.website,
  c.contact_name, c.contact_phone, c.contact_email, c.office_phone, c.fax,
  c.cert_expiry::date, c.notes
FROM organizations o,
(VALUES
  ('(주)딥러닝랩',     '202-02-00001', '김태현', '010-2222-0001', 'deeplab@example.com',
   'corporation', '2020-06-10', 'AI / 딥러닝', '영상인식 AI 엔진', 'https://deeplab.example.com',
   '박소연', '010-2222-1001', 'tax@deeplab.example.com', '055-222-0001', '055-222-0002',
   '2026-10-31', '벤처기업 인증, AI 바우처 공급기업'),
  ('(주)퀀텀소프트',   '202-02-00002', '이하늘', '010-2222-0002', 'quantum@example.com',
   'corporation', '2019-12-01', 'SW개발 / 보안', '양자내성 암호 SDK', 'https://quantum.example.com',
   '최민호', '010-2222-1002', 'admin@quantum.example.com', '055-222-0003', NULL,
   '2026-05-15', '특허 2건'),
  ('(주)블록체인허브', '202-02-00003', '박성민', '010-2222-0003', 'bchub@example.com',
   'corporation', '2021-03-20', '블록체인 / 핀테크', 'DID 인증 플랫폼', 'https://bchub.example.com',
   '이서윤', '010-2222-1003', 'biz@bchub.example.com', '055-222-0005', '055-222-0006',
   '2027-01-20', '벤처기업 인증'),
  ('사이버텍',         '202-02-00004', '최예린', '010-2222-0004', 'cybertech@example.com',
   'individual', '2023-01-15', '보안 / 모의해킹', '보안 취약점 진단 서비스', NULL,
   NULL, NULL, NULL, NULL, NULL,
   NULL, '프리랜서 보안 컨설턴트'),
  ('(주)메타플랫폼',   '202-02-00005', '정우석', '010-2222-0005', 'metaplat@example.com',
   'corporation', '2022-05-10', 'XR / 메타버스', '산업용 디지털트윈 솔루션', 'https://metaplat.example.com',
   '한지우', '010-2222-1005', 'tax@metaplat.example.com', '055-222-0009', NULL,
   '2026-08-20', NULL),
  ('(주)시큐리온',     '202-02-00006', '한소희', '010-2222-0006', 'securion@example.com',
   'corporation', '2020-11-05', '보안 / EDR', '엔드포인트 탐지 솔루션', 'https://securion.example.com',
   '김도현', '010-2222-1006', 'admin@securion.example.com', '055-222-0011', '055-222-0012',
   '2026-04-30', '벤처기업 인증, 조달청 등록'),
  ('(주)핀테크원',     '202-02-00007', '오민석', '010-2222-0007', 'fintech1@example.com',
   'corporation', '2021-09-01', '핀테크 / 결제', '간편결제 API 게이트웨이', 'https://fintech1.example.com',
   '윤채원', '010-2222-1007', 'biz@fintech1.example.com', '055-222-0013', NULL,
   '2026-11-10', NULL),
  ('(주)클리어데이터', '202-02-00008', '윤서아', '010-2222-0008', 'cleardata@example.com',
   'corporation', '2022-02-14', '빅데이터 / 분석', '실시간 로그 분석 플랫폼', 'https://cleardata.example.com',
   '정예진', '010-2222-1008', 'tax@cleardata.example.com', '055-222-0015', '055-222-0016',
   '2026-06-30', '소상공인 확인서')
) AS c(name, biz_number, representative, phone, email,
       corporate_type, founding_date, biz_desc, main_products, website,
       contact_name, contact_phone, contact_email, office_phone, fax,
       cert_expiry, notes)
WHERE o.type = 'g_tech';

-- G-테크벤처센터 계약
INSERT INTO contracts (company_id, space_id, org_id, start_date, end_date, rent_amount, deposit, status)
SELECT
  comp.id, sp.id, comp.org_id,
  '2025-06-01'::date, '2026-05-31'::date,
  (sp.area * 18000)::numeric(12,0),
  (sp.area * 18000 * 3)::numeric(12,0),
  'active'::contract_status
FROM (
  SELECT id, org_id, name, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM companies WHERE org_id = (SELECT id FROM organizations WHERE type = 'g_tech')
) comp
JOIN (
  SELECT id, area, name, ROW_NUMBER() OVER (ORDER BY name) AS rn
  FROM spaces WHERE org_id = (SELECT id FROM organizations WHERE type = 'g_tech') AND status = 'occupied'
) sp ON comp.rn = sp.rn;


-- ============================================
-- 3. 융합기술원 (convergence) — 2층 건물, 총 8실
-- ============================================
INSERT INTO spaces (org_id, name, area, status, floor, description)
SELECT o.id, s.name, s.area, s.status::space_status, s.floor, s.description
FROM organizations o,
(VALUES
  ('C-101', 36.36, 'occupied', '1F', '연구실'),
  ('C-102', 36.36, 'occupied', '1F', '연구실'),
  ('C-103', 52.89, 'occupied', '1F', '공동연구실'),
  ('C-104', 72.73, 'vacant',   '1F', '실험실'),
  ('C-201', 36.36, 'occupied', '2F', '연구실'),
  ('C-202', 52.89, 'occupied', '2F', '공동연구실'),
  ('C-203', 72.73, 'vacant',   '2F', '실험실'),
  ('C-204', 99.18, 'occupied', '2F', '대형 연구실')
) AS s(name, area, status, floor, description)
WHERE o.type = 'convergence';

-- 융합기술원 입주기업 (occupied 6실 → 6개 기업)
INSERT INTO companies (
  org_id, name, biz_number, representative, phone, email, status,
  corporate_type, founding_date, business_description, main_products, website,
  contact_name, contact_phone, contact_email, office_phone, fax,
  certification_expiry, notes
)
SELECT o.id,
  c.name, c.biz_number, c.representative, c.phone, c.email, 'active'::company_status,
  c.corporate_type, c.founding_date::date, c.biz_desc, c.main_products, c.website,
  c.contact_name, c.contact_phone, c.contact_email, c.office_phone, c.fax,
  c.cert_expiry::date, c.notes
FROM organizations o,
(VALUES
  ('(주)나노테크',     '303-03-00001', '김현정', '010-3333-0001', 'nanotech@example.com',
   'corporation', '2018-04-10', '나노소재 / 코팅', '나노 코팅 소재', 'https://nanotech.example.com',
   '이준서', '010-3333-1001', 'tax@nanotech.example.com', '055-333-0001', '055-333-0002',
   '2026-03-31', '벤처기업 인증, 특허 8건'),
  ('(주)바이오팜',     '303-03-00002', '이재원', '010-3333-0002', 'biopharm@example.com',
   'corporation', '2019-08-25', '바이오 / 의약품', '천연물 기반 건강기능식품', 'https://biopharm.example.com',
   '박지민', '010-3333-1002', 'biz@biopharm.example.com', '055-333-0003', '055-333-0004',
   '2025-12-31', '식약처 인증 보유'),
  ('(주)융합소재',     '303-03-00003', '박수연', '010-3333-0003', 'materials@example.com',
   'corporation', '2020-02-18', '신소재 / 복합재', '탄소섬유 복합소재', 'https://materials.example.com',
   '최서영', '010-3333-1003', 'admin@materials.example.com', '055-333-0005', NULL,
   '2026-09-15', '벤처기업 인증'),
  ('(주)스마트센서',   '303-03-00004', '최동욱', '010-3333-0004', 'smartsensor@example.com',
   'corporation', '2021-06-30', 'IoT / 센서', '산업용 환경 센서 모듈', 'https://smartsensor.example.com',
   '한수민', '010-3333-1004', 'tax@smartsensor.example.com', '055-333-0007', '055-333-0008',
   '2027-03-20', NULL),
  ('에코케미칼',       '303-03-00005', '정유나', '010-3333-0005', 'ecochem@example.com',
   'individual', '2023-03-01', '화학 / 친환경', '생분해성 포장재', NULL,
   NULL, NULL, NULL, NULL, NULL,
   NULL, '예비창업 프로그램 수료'),
  ('(주)메디사이언스', '303-03-00006', '한정호', '010-3333-0006', 'medisci@example.com',
   'corporation', '2020-10-12', '의료기기 / 진단', '현장진단 키트(POCT)', 'https://medisci.example.com',
   '윤하은', '010-3333-1006', 'biz@medisci.example.com', '055-333-0011', '055-333-0012',
   '2026-01-15', '의료기기 2등급 인증, 특허 4건')
) AS c(name, biz_number, representative, phone, email,
       corporate_type, founding_date, biz_desc, main_products, website,
       contact_name, contact_phone, contact_email, office_phone, fax,
       cert_expiry, notes)
WHERE o.type = 'convergence';

-- 융합기술원 계약
INSERT INTO contracts (company_id, space_id, org_id, start_date, end_date, rent_amount, deposit, status)
SELECT
  comp.id, sp.id, comp.org_id,
  '2025-01-01'::date, '2025-12-31'::date,
  (sp.area * 12000)::numeric(12,0),
  (sp.area * 12000 * 3)::numeric(12,0),
  'active'::contract_status
FROM (
  SELECT id, org_id, name, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM companies WHERE org_id = (SELECT id FROM organizations WHERE type = 'convergence')
) comp
JOIN (
  SELECT id, area, name, ROW_NUMBER() OVER (ORDER BY name) AS rn
  FROM spaces WHERE org_id = (SELECT id FROM organizations WHERE type = 'convergence') AND status = 'occupied'
) sp ON comp.rn = sp.rn;
