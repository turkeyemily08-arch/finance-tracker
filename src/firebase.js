import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyASbfzbyB7fhIls-3mbJTFMEvr-_OEk9t4',
  authDomain: 'finance-tracker-47f53.firebaseapp.com',
  projectId: 'finance-tracker-47f53',
  storageBucket: 'finance-tracker-47f53.firebasestorage.app',
  messagingSenderId: '317631980503',
  appId: '1:317631980503:web:999612715178e90e402192',
};

export const app = initializeApp(firebaseConfig);

// 오프라인 상태에서도 마지막으로 받은 데이터를 볼 수 있도록 로컬(IndexedDB) 캐시 활성화
// 같은 브라우저에서 탭을 여러 개 열어도 하나의 캐시를 공유하도록 persistentMultipleTabManager 사용
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
