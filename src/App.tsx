import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvent, Circle, useMap, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { create } from 'zustand';
import L from 'leaflet';
import './App.css';

// Leaflet 기본 마커 아이콘 fix (CRA + TS 환경)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// 타입 정의
type Place = {
  id: number;
  name: string;
  description: string;
  lat: number;
  lng: number;
  topicId: number;
  likes?: number;
  dislikes?: number;
  flags?: number;
  address?: string;
  image?: string;
  comments?: Comment[];
};

type Topic = {
  id: number;
  name: string;
};

type Comment = {
  id: number;
  text: string;
  likes: number;
};

// Zustand 스토어
type State = {
  topics: Topic[];
  places: Place[];
  addTopic: (name: string) => void;
  addPlace: (place: Omit<Place, 'id'>) => void;
  likePlace: (id: number) => void;
  dislikePlace: (id: number) => void;
  flagPlace: (id: number) => void;
  unlikePlace: (id: number) => void;
  undislikePlace: (id: number) => void;
  addComment: (placeId: number, text: string) => void;
  likeComment: (placeId: number, commentId: number) => void;
  unlikeComment: (placeId: number, commentId: number) => void;
};

let placeId = 1;
let topicId = 1;

// 랜덤 장소 데이터 생성 함수
function getRandomPlace(topicId: number): Place {
  const names = [
    '카페', '식당', '서점', '공원', '미용실', '편의점', '약국', '도서관', '헬스장', '마트',
    '분식집', '피자집', '치킨집', '병원', '베이커리', '커피숍', 'PC방', '노래방', '호텔', '게스트하우스'
  ];
  const descsByTopic: Record<number, string[]> = {
    1: [
      '휠체어 입장 가능',
      '장애인 화장실 있음',
      '입구에 경사로 설치',
      '직원들이 친절하게 도와줌',
      '테이블 간격 넓음',
      '엘리베이터 있음',
      '장애인 주차장 있음',
      '화장실 접근성 우수',
      '출입문 자동문',
      '휠체어 이동 동선 확보'
    ],
    2: [
      '노키즈존(아동 출입 제한)',
      '만 13세 미만 출입 불가',
      '조용한 분위기 유지',
      '아이 동반 시 입장 제한',
      '성인 전용 공간',
      '유아/아동 동반 불가',
      '노키즈존 안내문 부착',
      '아이 울음소리 걱정 없음',
      '어린이 출입 제한',
      '성인만 이용 가능'
    ]
  };
  // 서울시 전역(잠실 포함) 기준 랜덤 좌표 (범위 5배 확대)
  const lat = 37.45 + Math.random() * 0.4; // 37.45 ~ 37.85
  const lng = 126.80 + Math.random() * 0.4; // 126.80 ~ 127.20
  return {
    id: placeId++,
    name: `${names[Math.floor(Math.random() * names.length)]} ${Math.floor(Math.random() * 1000)}`,
    description: descsByTopic[topicId][Math.floor(Math.random() * descsByTopic[topicId].length)],
    lat,
    lng,
    topicId,
  };
}

function getRandomAddress() {
  const gu = ['송파구', '강남구', '서초구', '마포구', '용산구', '성동구', '광진구'];
  const dong = ['잠실동', '신천동', '삼성동', '역삼동', '서초동', '공덕동', '이태원동', '성수동', '화양동'];
  return `서울특별시 ${gu[Math.floor(Math.random()*gu.length)]} ${dong[Math.floor(Math.random()*dong.length)]} ${Math.floor(Math.random()*100)+1}번지`;
}

function getRandomImage() {
  // Unsplash 랜덤 이미지
  return `https://source.unsplash.com/400x300/?store,cafe,building,restaurant,park&sig=${Math.floor(Math.random()*10000)}`;
}

function getMockComments() {
  const texts = [
    '좋은 곳이에요!',
    '접근성이 좋아요.',
    '직원분이 친절했어요.',
    '조금 불편했어요.',
    '추천합니다!',
    '다시 방문하고 싶어요.',
    '위치가 애매해요.',
    '시설이 깨끗해요.',
    '분위기가 좋아요.',
    '주차가 편해요.'
  ];
  const n = 2 + Math.floor(Math.random()*2); // 2~3개
  return Array.from({length: n}, (_,i) => ({
    id: i+1,
    text: texts[Math.floor(Math.random()*texts.length)],
    likes: Math.floor(Math.random()*5)
  }));
}

const useStore = create<State>((set: any) => {
  // 주제 정의
  const topics: Topic[] = [
    { id: topicId++, name: '휠체어 가능한 가게' },
    { id: topicId++, name: '노키즈존' },
  ];
  // 각 주제별 100개 장소 생성 (likes/dislikes/flags 0으로 초기화)
  const places: Place[] = [
    ...Array.from({ length: 100 }, () => ({ ...getRandomPlace(1), likes: 0, dislikes: 0, flags: 0, address: getRandomAddress(), image: getRandomImage(), comments: getMockComments() })),
    ...Array.from({ length: 100 }, () => ({ ...getRandomPlace(2), likes: 0, dislikes: 0, flags: 0, address: getRandomAddress(), image: getRandomImage(), comments: getMockComments() })),
  ];
  return {
    topics,
    places,
    addTopic: (name: string) => set((state: State) => ({
      topics: [...state.topics, { id: topicId++, name }],
    })),
    addPlace: (place: Omit<Place, 'id'>) => set((state: State) => ({
      places: [...state.places, { ...place, id: placeId++, likes: 0, dislikes: 0, flags: 0 }],
    })),
    likePlace: (id: number) => set((state: State) => ({
      places: state.places.map(p => p.id === id ? { ...p, likes: (p.likes || 0) + 1 } : p),
    })),
    dislikePlace: (id: number) => set((state: State) => ({
      places: state.places.map(p => p.id === id ? { ...p, dislikes: (p.dislikes || 0) + 1 } : p),
    })),
    flagPlace: (id: number) => set((state: State) => ({
      places: state.places.map(p => p.id === id ? { ...p, flags: (p.flags || 0) + 1 } : p),
    })),
    unlikePlace: (id: number) => set((state: State) => ({
      places: state.places.map(p => p.id === id ? { ...p, likes: Math.max((p.likes || 0) - 1, 0) } : p),
    })),
    undislikePlace: (id: number) => set((state: State) => ({
      places: state.places.map(p => p.id === id ? { ...p, dislikes: Math.max((p.dislikes || 0) - 1, 0) } : p),
    })),
    addComment: (placeId: number, text: string) => set((state: State) => ({
      places: state.places.map(p => p.id === placeId ? {
        ...p,
        comments: [...(p.comments||[]), { id: Date.now(), text, likes: 0 }]
      } : p)
    })),
    likeComment: (placeId: number, commentId: number) => set((state: State) => ({
      places: state.places.map(p => p.id === placeId ? {
        ...p,
        comments: (p.comments||[]).map(c => c.id === commentId ? { ...c, likes: c.likes+1 } : c)
      } : p)
    })),
    unlikeComment: (placeId: number, commentId: number) => set((state: State) => ({
      places: state.places.map(p => p.id === placeId ? {
        ...p,
        comments: (p.comments||[]).map(c => c.id === commentId ? { ...c, likes: Math.max(c.likes-1,0) } : c)
      } : p)
    })),
  };
});

// 커스텀 마커 아이콘 (초록색)
const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// 지도 이동 핸들러 컴포넌트
function MapMoveHandler({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center[0], center[1], zoom]);
  return null;
}

function getInitials(str: string) {
  // 한글 초성 추출(간단 버전)
  const CHO = [
    'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'
  ];
  return Array.from(str).map(s => {
    const code = s.charCodeAt(0) - 44032;
    if (code >= 0 && code <= 11171) return CHO[Math.floor(code/588)];
    return s;
  }).join('');
}

function App() {
  const { topics, places, addTopic, addPlace, likePlace, dislikePlace, flagPlace, unlikePlace, undislikePlace, addComment, likeComment, unlikeComment } = useStore();
  const [selectedTopic, setSelectedTopic] = useState<number | undefined>(undefined);
  const [topicSearch, setTopicSearch] = useState('');
  const [newPlace, setNewPlace] = useState<{ name: string; description: string }>({ name: '', description: '' });
  const [selectedLatLng, setSelectedLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.5665, 126.978]);
  const [mapZoom, setMapZoom] = useState<number>(13);
  // 한 사람당 좋아요/싫어요/신고 중 하나씩만 투표 (로컬 상태)
  const [votedPlaces, setVotedPlaces] = useState<{ [placeId: number]: 'like' | 'dislike' | 'flag' | undefined }>({});
  // 마커 hover/클릭 상태
  const [hoveredPlaceId, setHoveredPlaceId] = useState<number|null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place|null>(null);
  // 댓글 입력 상태
  const [commentInput, setCommentInput] = useState('');
  // 댓글 좋아요(토글) 로컬 상태
  const [votedComments, setVotedComments] = useState<{ [commentId: number]: boolean }>({});
  // 추천/거리순 토글 상태
  const [sortOption, setSortOption] = useState<'recommend'|'distance'>('recommend');

  // localStorage 연동 (새로고침해도 유지)
  useEffect(() => {
    const saved = localStorage.getItem('votedPlaces');
    if (saved) setVotedPlaces(JSON.parse(saved));
  }, []);
  useEffect(() => {
    localStorage.setItem('votedPlaces', JSON.stringify(votedPlaces));
  }, [votedPlaces]);

  // 앱 로드시 현 위치 요청
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setMapCenter([latitude, longitude]);
          setMapZoom(16);
        },
        () => {
          setUserLocation(null); // 권한 거부/실패 시
          setMapCenter([37.5665, 126.978]);
          setMapZoom(13);
        }
      );
    }
  }, []);

  // 내 위치로 이동 버튼
  const handleMoveToMyLocation = () => {
    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lng]); // 항상 새 배열 할당
      setMapZoom((z) => z === 16 ? 16.0001 : 16); // zoom도 강제로 바꿔줌(같은 값이어도 리렌더)
    }
  };

  // 단일 주제 필터링
  const filteredPlaces = selectedTopic ? places.filter((p: Place) => p.topicId === selectedTopic) : [];

  // 내 위치와의 거리 계산 함수
  function getDistance(lat1:number, lng1:number, lat2:number, lng2:number) {
    // Haversine formula
    const R = 6371e3;
    const toRad = (d:number) => d * Math.PI / 180;
    const dLat = toRad(lat2-lat1);
    const dLng = toRad(lng2-lng1);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // meter
  }

  // 추천/거리순 정렬된 장소 목록
  let sortedPlaces = [...filteredPlaces];
  if (sortOption === 'recommend') {
    sortedPlaces.sort((a, b) => (b.likes||0) - (a.likes||0));
  } else if (sortOption === 'distance' && userLocation) {
    sortedPlaces.sort((a, b) =>
      getDistance(userLocation.lat, userLocation.lng, a.lat, a.lng) -
      getDistance(userLocation.lat, userLocation.lng, b.lat, b.lng)
    );
  }

  // 장소 추가 핸들러
  const handleAddPlace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlace.name || !selectedLatLng || !selectedTopic) return;
    addPlace({
      name: newPlace.name,
      description: newPlace.description,
      lat: selectedLatLng.lat,
      lng: selectedLatLng.lng,
      topicId: selectedTopic,
    });
    setNewPlace({ name: '', description: '' });
    setSelectedLatLng(null);
  };

  // 추천 주제 리스트(부분일치, 초성 등, 순서: 시작일치 > 부분일치)
  const searchLower = topicSearch.toLowerCase();
  const initialsSearch = getInitials(searchLower);
  const startsWithTopics = topics.filter(t => {
    const nameLower = t.name.toLowerCase();
    return (
      (nameLower.startsWith(searchLower) && searchLower) ||
      (getInitials(nameLower).startsWith(initialsSearch) && initialsSearch)
    );
  });
  const includesTopics = topics.filter(t => {
    const nameLower = t.name.toLowerCase();
    return (
      !startsWithTopics.includes(t) && (
        (nameLower.includes(searchLower) && searchLower) ||
        (getInitials(nameLower).includes(initialsSearch) && initialsSearch)
      )
    );
  });
  const similarTopics = [...startsWithTopics, ...includesTopics];
  // 완전 일치하는 주제
  const exactTopic = topics.find(t => t.name === topicSearch);
  // 검색 결과 없음
  const noResult = topicSearch.length > 0 && similarTopics.length === 0;
  // 검색창 ref로 위치 계산
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchBoxPos, setSearchBoxPos] = useState<{left:number,top:number,width:number}>({left:0,top:0,width:260});
  useEffect(() => {
    if (searchInputRef.current) {
      const rect = searchInputRef.current.getBoundingClientRect();
      setSearchBoxPos({left:rect.left, top:rect.bottom, width:rect.width});
    }
  }, [topicSearch]);

  // 지도 클릭 이벤트 핸들러 컴포넌트
  function MapClickHandler() {
    useMapEvent('click', (e) => {
      setSelectedLatLng({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    return null;
  }

  // 플래그 토글 함수 (카운트 증감)
  const handleFlagToggle = (place: Place) => {
    if (votedPlaces[place.id] === 'flag') {
      // 플래그 취소: -1
      useStore.setState((state: any) => ({
        places: state.places.map((p: Place) => p.id === place.id ? { ...p, flags: Math.max((p.flags || 0) - 1, 0) } : p),
      }));
      setVotedPlaces(v => {
        const copy = { ...v };
        delete copy[place.id];
        return copy;
      });
    } else {
      // 플래그: +1
      useStore.setState((state: any) => ({
        places: state.places.map((p: Place) => p.id === place.id ? { ...p, flags: (p.flags || 0) + 1 } : p),
      }));
      setVotedPlaces(v => ({ ...v, [place.id]: 'flag' }));
    }
  };

  return (
    <div className="App" style={{height:'100vh',display:'flex',flexDirection:'column'}}>
      <header style={{display:'flex',alignItems:'center',padding:'0 2.5rem',height:72,background:'#3a7afe',color:'#fff',boxShadow:'0 2px 8px #3a7afe22',position:'relative',fontSize:'1rem'}}>
        <span className="logo" style={{fontSize:'1.25rem',fontWeight:700,letterSpacing:'-1px',marginRight:24}}>{selectedTopic ? (topics.find(t=>t.id===selectedTopic)?.name) : '프리지도'}</span>
        <div style={{position:'relative',marginLeft:'auto',marginRight:24,width:260}}>
          <input
            ref={searchInputRef}
            value={topicSearch}
            onChange={e => setTopicSearch(e.target.value)}
            placeholder="주제 검색"
            style={{width:'100%',padding:'0.55rem 1rem',borderRadius:9,border:'none',fontSize:'0.98rem',boxShadow:'0 1px 4px #0001',outline:'none',color:'#222'}}/>
        </div>
        <div style={{width:40}} /> {/* 오른쪽 여백 */}
      </header>
      {/* 추천/자동완성 리스트: 헤더 아래, 검색창과 같은 세로축에 고정 */}
      {topicSearch && (
        <div
          style={{
            position:'fixed',
            left:searchBoxPos.left,
            top:searchBoxPos.top,
            width:searchBoxPos.width,
            background:'#fff',
            color:'#222',
            borderRadius:10,
            boxShadow:'0 2px 16px #0003',
            zIndex:3000,
            maxHeight:240,
            overflowY:'auto',
            fontSize:'0.97rem',
          }}
        >
          {similarTopics.length > 0 ? similarTopics.map(t => (
            <div
              key={t.id}
              onClick={() => { setSelectedTopic(t.id); setTopicSearch(''); }}
              style={{padding:'0.65rem 1.1rem',cursor:'pointer',fontWeight:selectedTopic===t.id?700:400,background:selectedTopic===t.id?'#f0f6ff':'#fff'}}
            >
              {t.name}
            </div>
          )) : (
            <>
              <div style={{padding:'0.65rem 1.1rem',color:'#888'}}>비슷한 주제가 없어요.</div>
              {/* 새 주제 만들기 */}
              {!exactTopic && (
                <div style={{padding:'0.65rem 1.1rem',borderTop:'1px solid #f0f0f0'}}>
                  <button
                    onClick={() => { addTopic(topicSearch); setTopicSearch(''); setSelectedTopic(topics[topics.length-1].id+1); }}
                    style={{background:'#3a7afe',color:'#fff',border:'none',borderRadius:8,padding:'0.4rem 1.2rem',fontWeight:600,cursor:'pointer',fontSize:'0.97em'}}
                  >
                    "{topicSearch}" 새 주제 만들기
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
      <div className="main-content" style={{flex:1,display:'flex',height:'100%',minHeight:0}}>
        <section className="sidebar" style={{display:'flex',flexDirection:'column',height:'100%',minWidth:260,background:'#fff',boxShadow:'1px 0 8px #0001'}}>
          {selectedTopic ? (
            <>
              <div style={{padding:'18px 0 8px 0',background:'#fff',zIndex:2}}>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>setSortOption('recommend')} style={{flex:1,padding:'0.4rem 0',border:'none',borderRadius:7,background:sortOption==='recommend'?'#3a7afe':'#f3f6fa',color:sortOption==='recommend'?'#fff':'#222',fontWeight:sortOption==='recommend'?700:500,cursor:'pointer'}}>추천순</button>
                  <button onClick={()=>setSortOption('distance')} style={{flex:1,padding:'0.4rem 0',border:'none',borderRadius:7,background:sortOption==='distance'?'#3a7afe':'#f3f6fa',color:sortOption==='distance'?'#fff':'#222',fontWeight:sortOption==='distance'?700:500,cursor:'pointer'}}>거리순</button>
                </div>
              </div>
              {/* 장소 추천 목록 (스크롤 영역) */}
              <div style={{flex:1,overflowY:'auto',minHeight:0}}>
                {sortedPlaces.length === 0 ? (
                  <div style={{color:'#888',padding:'1.5rem 0',textAlign:'center'}}>추천할 장소가 없습니다.</div>
                ) : (
                  <ul style={{listStyle:'none',padding:0,margin:0}}>
                    {sortedPlaces.map((place, idx) => {
                      let distance = null;
                      if (sortOption==='distance' && userLocation) {
                        distance = getDistance(userLocation.lat, userLocation.lng, place.lat, place.lng);
                      }
                      return (
                        <li key={place.id} style={{padding:'0.7rem 0.2rem',borderBottom:'1px solid #f0f0f0',display:'flex',alignItems:'center',gap:8}}>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:600,fontSize:'1.04em'}}>{place.name}</div>
                            <div style={{fontSize:'0.97em',color:'#3a7afe',marginBottom:2}}>{place.address}</div>
                            <div style={{fontSize:'0.93em',color:'#888'}}>{place.description}</div>
                            <div style={{fontSize:'0.93em',color:'#888',marginTop:2}}>
                              👍 {place.likes||0}
                              {distance!==null && (
                                <span style={{marginLeft:8}}>
                                  {distance<1000 ? `${distance.toFixed(0)}m` : `${(distance/1000).toFixed(2)}km`} 거리
                                </span>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {/* 거리순인데 내 위치 없을 때 안내 */}
                {sortOption==='distance' && !userLocation && (
                  <div style={{color:'#e67e22',fontSize:'0.98em',marginTop:10}}>내 위치 정보가 필요합니다.</div>
                )}
              </div>
            </>
          ) : (
            <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'#3a7afe',fontWeight:600,fontSize:'1.08em',opacity:0.85}}>
              <span style={{fontSize:'2.2em',marginBottom:8}}>🧭</span>
              주제를 선택해 주세요
            </div>
          )}
          {/* 맨 아래: 내 장소 추가하기 (고정, 주제 선택 시에만) */}
          {selectedTopic && (
            <div style={{borderTop:'1px solid #f0f0f0',padding:'1rem 0 0 0',background:'#fff',zIndex:2}}>
              <form onSubmit={handleAddPlace} className="place-form">
                <h3>장소 추가</h3>
                <div style={{ fontSize: '0.97rem', color: '#3a7afe', marginBottom: 6 }}>
                  지도에서 위치를 먼저 선택하세요!
                </div>
                <input
                  value={newPlace.name}
                  onChange={(e) => setNewPlace({ ...newPlace, name: e.target.value })}
                  placeholder="장소명"
                  required
                />
                <input
                  value={newPlace.description}
                  onChange={(e) => setNewPlace({ ...newPlace, description: e.target.value })}
                  placeholder="설명"
                />
                {/* 위도/경도 입력란 제거 */}
                {selectedLatLng && (
                  <div style={{ fontSize: '0.92rem', color: '#888', marginTop: 2 }}>
                    선택 위치: {selectedLatLng.lat.toFixed(5)}, {selectedLatLng.lng.toFixed(5)}
                  </div>
                )}
                <button type="submit" disabled={!selectedLatLng || !selectedTopic}>장소 추가</button>
              </form>
            </div>
          )}
        </section>
        <section className="map-section" style={{flex:1,position:'relative',height:'100%'}}>
          <MapContainer
            center={[37.5665, 126.978]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <MapMoveHandler center={mapCenter} zoom={mapZoom} />
            <MapClickHandler />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* 내 위치 원 */}
            {userLocation && (
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={30}
                pathOptions={{ color: '#3a7afe', fillColor: '#3a7afe', fillOpacity: 0.3 }}
              />
            )}
            {/* 기존 장소 마커 */}
            {filteredPlaces.map((place: Place) => {
              const voted = votedPlaces[place.id];
              return (
                <Marker
                  key={place.id}
                  position={[place.lat, place.lng]}
                  eventHandlers={{
                    mouseover: () => setHoveredPlaceId(place.id),
                    mouseout: () => setHoveredPlaceId(null),
                    click: () => setSelectedPlace(place)
                  }}
                >
                  {hoveredPlaceId === place.id && (
                    <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                      <div style={{fontWeight:600}}>{place.name}</div>
                      <div style={{fontSize:'0.92em',color:'#555'}}>{place.address}</div>
                    </Tooltip>
                  )}
                </Marker>
              );
            })}
            {/* 임시 마커 */}
            {selectedLatLng && (
              <Marker position={[selectedLatLng.lat, selectedLatLng.lng]} icon={greenIcon}>
                <Popup>여기에 장소를 추가할 수 있습니다!</Popup>
              </Marker>
            )}
            {/* 커스텀 오버레이(모달) */}
            {selectedPlace && (
              <div style={{
                position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.25)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'
              }} onClick={()=>setSelectedPlace(null)}>
                <div style={{
                  background:'#fff',borderRadius:20,padding:0,boxShadow:'0 4px 32px #0002',width:700,maxWidth:'95vw',minHeight:380,display:'flex',overflow:'hidden',position:'relative'
                }} onClick={e=>e.stopPropagation()}>
                  {/* 왼쪽: 장소 정보 */}
                  <div style={{flex:'1 1 0',padding:28,display:'flex',flexDirection:'column',alignItems:'center',background:'#f7f9fa'}}>
                    <img src={selectedPlace.image} alt="장소" style={{width:220,height:160,objectFit:'cover',borderRadius:14,marginBottom:18,boxShadow:'0 2px 8px #0001'}}/>
                    <div style={{fontWeight:700,fontSize:'1.25em',marginBottom:6}}>{selectedPlace.name}</div>
                    <div style={{color:'#3a7afe',fontWeight:500,marginBottom:8}}>{selectedPlace.address}</div>
                    <div style={{color:'#555',fontSize:'0.98em',marginBottom:12}}>{selectedPlace.description}</div>
                    <div style={{display:'flex',gap:10,marginTop:'auto'}}>
                      <button style={{background:'none',border:'none',color:'#3a7afe',fontWeight:600,fontSize:'1.1em'}}>👍 {selectedPlace.likes||0}</button>
                      <button style={{background:'none',border:'none',color:'#e67e22',fontWeight:600,fontSize:'1.1em'}}>👎 {selectedPlace.dislikes||0}</button>
                      <button style={{background:'none',border:'none',color:'#e74c3c',fontWeight:600,fontSize:'1.1em'}}>🚩 {selectedPlace.flags||0}</button>
                    </div>
                  </div>
                  {/* 오른쪽: 댓글 */}
                  <div style={{flex:'1 1 0',padding:'28px 24px 24px 24px',display:'flex',flexDirection:'column',background:'#fff',minWidth:320}}>
                    <div style={{fontWeight:700,fontSize:'1.1em',marginBottom:10}}>댓글</div>
                    {/* 댓글 입력란 */}
                    <form onSubmit={e=>{
                      e.preventDefault();
                      if(commentInput.trim()){
                        addComment(selectedPlace.id, commentInput.trim());
                        setCommentInput('');
                      }
                    }} style={{display:'flex',gap:8,marginBottom:18}}>
                      <input value={commentInput} onChange={e=>setCommentInput(e.target.value)} placeholder="댓글을 입력하세요" style={{flex:1,padding:'7px 12px',borderRadius:8,border:'1px solid #ddd',fontSize:'1em'}}/>
                      <button type="submit" style={{background:'#3a7afe',color:'#fff',border:'none',borderRadius:8,padding:'0 16px',fontWeight:600,cursor:'pointer'}}>등록</button>
                    </form>
                    {/* 댓글 리스트 (좋아요순) */}
                    <div style={{flex:1,overflowY:'auto',maxHeight:220}}>
                      {[...(selectedPlace.comments||[])].sort((a,b)=>b.likes-a.likes).map(c=>(
                        <div key={c.id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,padding:'7px 0',borderBottom:'1px solid #f0f0f0'}}>
                          <span style={{flex:1}}>{c.text}</span>
                          <button
                            onClick={()=>{
                              if(votedComments[c.id]){
                                unlikeComment(selectedPlace.id, c.id);
                                setVotedComments(v=>({...v,[c.id]:false}));
                              }else{
                                likeComment(selectedPlace.id, c.id);
                                setVotedComments(v=>({...v,[c.id]:true}));
                              }
                            }}
                            style={{background:'none',border:'none',color:'#3a7afe',fontWeight:600,cursor:'pointer'}}
                          >
                            👍 {c.likes}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* 닫기 버튼 */}
                  <button onClick={()=>setSelectedPlace(null)} style={{position:'absolute',top:14,right:14,background:'none',border:'none',fontSize:'1.5em',color:'#888',cursor:'pointer'}}>×</button>
                </div>
              </div>
            )}
          </MapContainer>
          {/* 내 위치로 이동 버튼: 지도 오른쪽 하단 플로팅 (지도 영역 내) */}
          <button
            onClick={handleMoveToMyLocation}
            style={{
              position:'absolute',
              right:24,
              bottom:24,
              zIndex:1200,
              background:'#3a7afe',
              color:'#fff',
              border:'none',
              borderRadius: '50%',
              width:56,
              height:56,
              boxShadow:'0 2px 12px #3a7afe33',
              fontWeight:700,
              fontSize:'1.3rem',
              cursor:'pointer',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              padding:0
            }}
            title="내 위치로 이동"
          >
            <span role="img" aria-label="내 위치">📍</span>
          </button>
        </section>
      </div>
    </div>
  );
}

export default App;
