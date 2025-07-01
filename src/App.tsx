import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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
  // 서울시 중심부 기준 랜덤 좌표
  const lat = 37.55 + Math.random() * 0.08; // 37.55 ~ 37.63
  const lng = 126.95 + Math.random() * 0.08; // 126.95 ~ 127.03
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

function App() {
  const { topics, places, addTopic, addPlace } = useStore();
  const [selectedTopic, setSelectedTopic] = useState<number>(topics[0]?.id || 1);
  const [newTopic, setNewTopic] = useState('');
  const [newPlace, setNewPlace] = useState<{ name: string; description: string; lat: string; lng: string }>({ name: '', description: '', lat: '', lng: '' });

  // 필터링된 장소
  const filteredPlaces = places.filter((p: Place) => p.topicId === selectedTopic);

  // 장소 추가 핸들러
  const handleAddPlace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlace.name || !newPlace.lat || !newPlace.lng) return;
    addPlace({
      name: newPlace.name,
      description: newPlace.description,
      lat: parseFloat(newPlace.lat),
      lng: parseFloat(newPlace.lng),
      topicId: selectedTopic,
    });
    setNewPlace({ name: '', description: '', lat: '', lng: '' });
  };

  // 주제 추가 핸들러
  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic) return;
    addTopic(newTopic);
    setNewTopic('');
  };

  return (
    <div className="App">
      <header>
        <span className="logo">프리지도</span>
      </header>
      <div className="main-content">
        <section className="sidebar">
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
            <input
              value={newPlace.lat}
              onChange={(e) => setNewPlace({ ...newPlace, lat: e.target.value })}
              placeholder="위도(lat)"
              required
              type="number"
              step="any"
            />
            <input
              value={newPlace.lng}
              onChange={(e) => setNewPlace({ ...newPlace, lng: e.target.value })}
              placeholder="경도(lng)"
              required
              type="number"
              step="any"
            />
            <button type="submit">장소 추가</button>
          </form>
        </section>
        <section className="map-section">
          <MapContainer center={[37.5665, 126.978] as [number, number]} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filteredPlaces.map((place: Place) => (
              <Marker key={place.id} position={[place.lat, place.lng]}>
                <Popup>
                  <b>{place.name}</b>
                  <br />
                  {place.description}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </section>
      </div>
    </div>
  );
}

export default App;
