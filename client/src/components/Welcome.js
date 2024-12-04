import React, {useContext} from 'react';
import '../styles/Welcome.css';
import { AuthContext } from '../AuthContext';
import bball from '../../src/bball.png';

export default function Welcome() {
  const {signIn} = useContext(AuthContext);
  return (
    <div className="welcome-container">
      <img src={bball} alt="basketball" className="welcome-image" />
      <h1 className="welcome-title">Welcome to the Simulated Basketball Association!</h1>
      <button className="league-button" onClick={signIn}>View League</button>
    </div>
  );
}