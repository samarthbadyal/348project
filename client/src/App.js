import { useContext } from 'react';
import './styles/App.css';
import { AuthContext } from "./AuthContext";
import Welcome from './components/Welcome';
import MainScreen from './components/MainScreen';

function App() {
  const { isAuthenticated } = useContext(AuthContext);

  console.log('isAuthenticated', isAuthenticated);

  return (
    <div>
      {!isAuthenticated ? <Welcome /> : <MainScreen />}
    </div>
  );
}

export default App;