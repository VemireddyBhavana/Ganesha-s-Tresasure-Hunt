import { db } from "./firebaseConfig";
import { collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "firebase/firestore";

const COLLECTION_NAME = "leaderboard";

/**
 * Save player score to Firebase Firestore and local backup
 */
export async function saveScore(playerName, score, stars = 3, timeLeft = 0) {
  try {
    const localScores = JSON.parse(localStorage.getItem("ganesha_leaderboard_local") || "[]");
    localScores.push({
      playerName: playerName || "Festival Seva Volunteer",
      score,
      stars,
      timeLeft,
      createdAt: new Date().toISOString()
    });
    localScores.sort((a, b) => b.score - a.score);
    localStorage.setItem("ganesha_leaderboard_local", JSON.stringify(localScores.slice(0, 20)));
  } catch (e) {
    console.warn("Local storage save warning:", e);
  }

  if (db && import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    try {
      await addDoc(collection(db, COLLECTION_NAME), {
        playerName: playerName || "Festival Seva Volunteer",
        score,
        stars,
        timeLeft,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Could not save to Firebase Firestore:", e);
    }
  }
}

/**
 * Fetch top scores from Firebase or localStorage/competition defaults
 */
export async function getTopScores(maxCount = 10) {
  const fallbackDefaults = [
    { id: "1", playerName: "Aarav M.", score: 480, stars: 3, rank: 1 },
    { id: "2", playerName: "Diya K.", score: 450, stars: 3, rank: 2 },
    { id: "3", playerName: "Rohan S.", score: 410, stars: 2, rank: 3 },
    { id: "4", playerName: "Bhavana & Team", score: 390, stars: 3, rank: 4 },
    { id: "5", playerName: "Siddharth", score: 360, stars: 2, rank: 5 },
  ];

  if (db && import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        orderBy("score", "desc"),
        limit(maxCount)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map((doc, idx) => ({
          id: doc.id,
          rank: idx + 1,
          ...doc.data()
        }));
      }
    } catch (e) {
      console.warn("Firestore query notice (using local/fallback):", e);
    }
  }

  try {
    const local = JSON.parse(localStorage.getItem("ganesha_leaderboard_local") || "[]");
    const merged = [...local, ...fallbackDefaults];
    merged.sort((a, b) => b.score - a.score);
    return merged.slice(0, maxCount).map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  } catch (e) {
    return fallbackDefaults;
  }
}
