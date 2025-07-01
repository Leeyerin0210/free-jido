import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvent, Circle, useMap } from 'react-leaflet';
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
};

type Topic = {
  id: number;
  name: string;
};

// Zustand 스토어
type State = {
  topics: Topic[];
  places: Place[];
  addTopic: (name: string) => void;
  addPlace: (place: Omit<Place, 'id'>) => void;
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

const useStore = create<State>((set: any) => {
  // 주제 정의
  const topics: Topic[] = [
    { id: topicId++, name: '휠체어 가능한 가게' },
    { id: topicId++, name: '노키즈존' },
  ];
  // 각 주제별 100개 장소 생성
  const places: Place[] = [
    ...Array.from({ length: 100 }, () => getRandomPlace(1)),
    ...Array.from({ length: 100 }, () => getRandomPlace(2)),
  ];
  return {
    topics,
    places,
    addTopic: (name: string) => set((state: State) => ({
      topics: [...state.topics, { id: topicId++, name }],
    })),
    addPlace: (place: Omit<Place, 'id'>) => set((state: State) => ({
      places: [...state.places, { ...place, id: placeId++ }],
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

function App() {
  const { topics, places, addTopic, addPlace } = useStore();
  const [selectedTopic, setSelectedTopic] = useState<number>(topics[0]?.id || 1);
  const [newTopic, setNewTopic] = useState('');
  const [newPlace, setNewPlace] = useState<{ name: string; description: string }>({ name: '', description: '' });
  const [selectedLatLng, setSelectedLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.5665, 126.978]);
  const [mapZoom, setMapZoom] = useState<number>(13);

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

  // 필터링된 장소
  const filteredPlaces = places.filter((p: Place) => p.topicId === selectedTopic);

  // 장소 추가 핸들러
  const handleAddPlace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlace.name || !selectedLatLng) return;
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

  // 주제 추가 핸들러
  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic) return;
    addTopic(newTopic);
    setNewTopic('');
  };

  // 지도 클릭 이벤트 핸들러 컴포넌트
  function MapClickHandler() {
    useMapEvent('click', (e) => {
      setSelectedLatLng({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    return null;
  }

  return (
    <div className="App">
      <header>
        <span className="logo">프리지도</span>
      </header>
      <div className="main-content">
        <section className="sidebar">
          <button onClick={handleMoveToMyLocation} style={{marginBottom: 16, background: '#3a7afe', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1.1rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', boxShadow: '0 2px 8px #3a7afe22', transition: 'background 0.2s'}}>내 위치로 이동</button>
          <form onSubmit={handleAddTopic} className="topic-form">
            <input
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="새 주제 이름"
            />
            <button type="submit">주제 추가</button>
          </form>
          <div className="topic-list">
            {topics.map((topic: Topic) => (
              <button
                key={topic.id}
                className={selectedTopic === topic.id ? 'active' : ''}
                onClick={() => setSelectedTopic(topic.id)}
              >
                {topic.name}
              </button>
            ))}
          </div>
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
            <button type="submit" disabled={!selectedLatLng}>장소 추가</button>
          </form>
        </section>
        <section className="map-section">
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
            {filteredPlaces.map((place: Place) => (
              <Marker key={place.id} position={[place.lat, place.lng]}>
                <Popup>
                  <b>{place.name}</b>
                  <br />
                  {place.description}
                </Popup>
              </Marker>
            ))}
            {/* 임시 마커 */}
            {selectedLatLng && (
              <Marker position={[selectedLatLng.lat, selectedLatLng.lng]} icon={greenIcon}>
                <Popup>여기에 장소를 추가할 수 있습니다!</Popup>
              </Marker>
            )}
          </MapContainer>
        </section>
      </div>
    </div>
  );
}

export default App;
