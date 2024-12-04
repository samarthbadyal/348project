import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import '../styles/MainScreen.css';
import { API_URL } from '../config';
import { AuthContext } from '../AuthContext';

export default function MainScreen() {
  const [selectedTab, setSelectedTab] = useState('team'); 
  const [formData, setFormData] = useState({}); 
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]); 
  const [matchups, setMatchups] = useState([]); 
  const [errors, setErrors] = useState({});
  const [editMode, setEditMode] = useState(false); 
  const [editId, setEditId] = useState(null); 
  const [simulatingGameIds, setSimulatingGameIds] = useState([]); 
  const [playerStats, setPlayerStats] = useState([]);
  const [sortField, setSortField] = useState('points');
  const [perGame, setPerGame] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc');
  const {signOut} = useContext(AuthContext);

  useEffect(() => {
    fetchTeams();
    fetchPlayers();
    fetchMatchups();
  }, []);




  const [selectedMatchupStats, setSelectedMatchupStats] = useState(null);
  const [selectedPlayerStats, setSelectedPlayerStats] = useState(null); 

  const fetchPlayerStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/players/stats`, {
        params: {
          sortBy: sortField,
          perGame: perGame.toString(),
          order: sortOrder,
        },
      });
      setPlayerStats(response.data);
    } catch (error) {
      console.error('Error fetching player stats:', error);
    }
  };
  useEffect(() => {
    if (selectedTab === 'leaderboard') {
      fetchPlayerStats();
    }
  }, [selectedTab, sortField, perGame, sortOrder]);
  const handleViewPlayerStats = (player) => {
    if (selectedPlayerStats && selectedPlayerStats._id === player._id) {
      // If the player is already selected, deselect
      setSelectedPlayerStats(null);
    } else {
      setSelectedPlayerStats(player);
    }
  };


  const handleSimulate = async (gameId) => {
    setSimulatingGameIds((prev) => [...prev, gameId]); // Add gameId to simulating list
    try {
      await axios.post(`${API_URL}/matchups/${gameId}/simulate`);
      alert('Game simulated successfully!');
      fetchMatchups(); // Refresh matchups to get updated data
      fetchPlayers();  // Refresh players to get updated stats
    } catch (error) {
      console.error('Error simulating game:', error);
      alert('Error simulating game.');
    } finally {
      setSimulatingGameIds((prev) => prev.filter((id) => id !== gameId)); // Remove gameId from simulating list
    }
  };

const handleViewStats = (matchup) => {
  if (selectedMatchupStats && selectedMatchupStats._id === matchup._id) {
    // If already viewing, toggle off
    setSelectedMatchupStats(null);
  } else {
    setSelectedMatchupStats(matchup);
  }
};

  const fetchTeams = async () => {
    try {
      const response = await axios.get(`${API_URL}/teams`);
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchPlayers = async () => {
    try {
      const response = await axios.get(`${API_URL}/players`);
      setPlayers(response.data);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchMatchups = async () => {
    try {
      const response = await axios.get(`${API_URL}/matchups`);
      setMatchups(response.data);
    } catch (error) {
      console.error('Error fetching matchups:', error);
    }
  };

  const handleTabChange = (tab) => {
    setSelectedTab(tab);
    setFormData({});
    setErrors({});
    setEditMode(false);
    setEditId(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({}); // Reset errors

    try {
      let endpoint = `${API_URL}/${selectedTab}s`;
      if (editMode) {
        // Frontend uniqueness check for team names
        if (selectedTab === 'team') {
          const existingTeam = teams.find(
            (team) => team.name === formData.name && team._id !== editId
          );
          if (existingTeam) {
            setErrors({ general: 'Team name must be unique.' });
            return;
          }
        }

        // Frontend uniqueness check for player names
        if (selectedTab === 'player') {
          const existingPlayer = players.find(
            (player) =>
              player.firstName === formData.firstName &&
              player.lastName === formData.lastName &&
              player._id !== editId
          );
          if (existingPlayer) {
            setErrors({ general: 'Player name must be unique.' });
            return;
          }
        }

        // Edit existing entity
        await axios.put(`${endpoint}/${editId}`, formData);
        alert(`${selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1)} updated successfully!`);
      } else {
        // Additional frontend validation for matchup
        if (selectedTab === 'matchup') {
          if (formData.homeTeam === formData.awayTeam) {
            setErrors({ awayTeam: 'Home team and away team must be different.' });
            return;
          }
        }

        // Frontend uniqueness check for team names
        if (selectedTab === 'team') {
          const existingTeam = teams.find((team) => team.name === formData.name);
          if (existingTeam) {
            setErrors({ general: 'Team name must be unique.' });
            return;
          }
        }

        // Frontend uniqueness check for player names
        if (selectedTab === 'player') {
          const existingPlayer = players.find(
            (player) =>
              player.firstName === formData.firstName && player.lastName === formData.lastName
          );
          if (existingPlayer) {
            setErrors({ general: 'Player name must be unique.' });
            return;
          }
        }

        // Create new entity
        await axios.post(endpoint, formData);
        alert(`${selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1)} created successfully!`);
      }
      setFormData({});
      setEditMode(false);
      setEditId(null);
      fetchTeams();
      fetchPlayers();
      fetchMatchups();
    } catch (error) {
      console.error('Error saving object:', error);
      if (error.response && error.response.data.errors) {
        setErrors(error.response.data.errors);
      } else if (error.response && error.response.data.error) {
        setErrors({ general: error.response.data.error });
      } else {
        alert('Error saving object.');
      }
    }
  };

  const handleEdit = (entity, type) => {
    setSelectedTab(type);
    setFormData({
      ...entity,
      team: entity.team?._id || entity.team, // For players
      homeTeam: entity.homeTeam?._id || entity.homeTeam, // For matchups
      awayTeam: entity.awayTeam?._id || entity.awayTeam, // For matchups
    });
    setEditMode(true);
    setEditId(entity._id);
    setErrors({});
  };

  const handleDelete = async (id, type) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await axios.delete(`${API_URL}/${type}s/${id}`);
        alert(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully!`);
        fetchTeams();
        fetchPlayers();
        fetchMatchups();
      } catch (error) {
        console.error('Error deleting object:', error);
        alert('Error deleting object.');
      }
    }
  };

  const getMinDateTimeLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); 
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Compute the locations based on selected homeTeam and awayTeam
  const homeTeamObj = teams.find((team) => team._id === formData.homeTeam);
  const awayTeamObj = teams.find((team) => team._id === formData.awayTeam);

  let locations = [];
  if (homeTeamObj && homeTeamObj.city) {
    locations.push({ city: homeTeamObj.city, teamName: homeTeamObj.name });
  }
  if (awayTeamObj && awayTeamObj.city && (!homeTeamObj || awayTeamObj.city !== homeTeamObj.city)) {
    locations.push({ city: awayTeamObj.city, teamName: awayTeamObj.name });
  }

  return (
    <div className="main-screen">
      <h1>Simulated Basketball Association</h1>
      <div className="tabs">

        <button onClick={() => handleTabChange('team')} className={selectedTab === 'team' ? 'active' : ''}>
          {editMode ? 'Edit Team' : 'Create Team'}
        </button>
        <button onClick={() => handleTabChange('player')} className={selectedTab === 'player' ? 'active' : ''}>
          {editMode ? 'Edit Player' : 'Create Player'}
        </button>
        <button onClick={() => handleTabChange('matchup')} className={selectedTab === 'matchup' ? 'active' : ''}>
          {editMode ? 'Edit Matchup' : 'Create Matchup'}
        </button>
        <button
          onClick={() => handleTabChange('viewTeams')}
          className={selectedTab === 'viewTeams' ? 'active' : ''}
        >
          View Teams
        </button>
        <button
          onClick={() => handleTabChange('viewPlayers')}
          className={selectedTab === 'viewPlayers' ? 'active' : ''}
        >
          View Players
        </button>
        <button
          onClick={() => handleTabChange('viewMatchups')}
          className={selectedTab === 'viewMatchups' ? 'active' : ''}
        >
          View Matchups
        </button>
        <button
          onClick={() => handleTabChange('leaderboard')}
          className={selectedTab === 'leaderboard' ? 'active' : ''}
        >
          Player Stats
        </button>
        <button onClick={signOut}>Log out</button>
      </div>

      {(selectedTab === 'team' || selectedTab === 'player' || selectedTab === 'matchup') && (
        <form onSubmit={handleSubmit} className="form">
          {selectedTab === 'team' && (
            <>
              <input
                type="text"
                name="name"
                placeholder="Team Name"
                value={formData.name || ''}
                onChange={handleInputChange}
                required
              />
              {errors.name && <p className="error">{errors.name}</p>}
              <input
                type="text"
                name="city"
                placeholder="City"
                value={formData.city || ''}
                onChange={handleInputChange}
                required
              />
              {errors.city && <p className="error">{errors.city}</p>}
              {errors.general && <p className="error">{errors.general}</p>}
              <button type="submit">{editMode ? 'Update' : 'Create'} Team</button>
            </>
          )}

          {selectedTab === 'player' && (
            <>
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName || ''}
                onChange={handleInputChange}
                required
              />
              {errors.firstName && <p className="error">{errors.firstName}</p>}
              <input
                type="text"
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName || ''}
                onChange={handleInputChange}
                required
              />
              {errors.lastName && <p className="error">{errors.lastName}</p>}
              <input
                type="text"
                name="position"
                placeholder="Position (e.g., PG, SG)"
                value={formData.position || ''}
                onChange={handleInputChange}
                required
              />
              {errors.position && <p className="error">{errors.position}</p>}
              <select name="team" value={formData.team || ''} onChange={handleInputChange} required>
                <option value="">Select Team</option>
                {teams.map((team) => (
                  <option key={team._id} value={team._id}>
                    {team.name}
                  </option>
                ))}
              </select>
              {errors.team && <p className="error">{errors.team}</p>}
              <input
                type="number"
                name="heightCm"
                placeholder="Height (cm)"
                value={formData.heightCm || ''}
                onChange={handleInputChange}
                required
              />
              {errors.heightCm && <p className="error">{errors.heightCm}</p>}
              <input
                type="number"
                name="weightLbs"
                placeholder="Weight (lbs)"
                value={formData.weightLbs || ''}
                onChange={handleInputChange}
                required
              />
              {errors.weightLbs && <p className="error">{errors.weightLbs}</p>}
              <input
                type="number"
                name="skill"
                placeholder="Skill level (0-99)"
                min="0"
                max="99"
                value={formData.skill || ''}
                onChange={handleInputChange}
                required
              />
              {errors.skill && <p className="error">{errors.skill}</p>}
              {errors.general && <p className="error">{errors.general}</p>}
              <button type="submit">{editMode ? 'Update' : 'Create'} Player</button>
            </>
          )}

          {selectedTab === 'matchup' && (
            <>
              <select name="homeTeam" value={formData.homeTeam || ''} onChange={handleInputChange} required>
                <option value="">Select Home Team</option>
                {teams.map((team) => (
                  <option key={team._id} value={team._id}>
                    {team.name}
                  </option>
                ))}
              </select>
              {errors.homeTeam && <p className="error">{errors.homeTeam}</p>}

              <select name="awayTeam" value={formData.awayTeam || ''} onChange={handleInputChange} required>
                <option value="">Select Away Team</option>
                {teams
                  .filter((team) => team._id !== formData.homeTeam)
                  .map((team) => (
                    <option key={team._id} value={team._id}>
                      {team.name}
                    </option>
                  ))}
              </select>
              {errors.awayTeam && <p className="error">{errors.awayTeam}</p>}

              <select name="location" value={formData.location || ''} onChange={handleInputChange} required>
                <option value="">Select Location</option>
                {locations.map((loc) => (
                  <option key={loc.city} value={loc.city}>
                    {loc.city} ({loc.teamName})
                  </option>
                ))}
              </select>
              {errors.location && <p className="error">{errors.location}</p>}

              <input
                type="datetime-local"
                name="date"
                min={getMinDateTimeLocal()}
                value={formData.date || ''}
                onChange={handleInputChange}
                required
              />
              {errors.date && <p className="error">{errors.date}</p>}
              {errors.general && <p className="error">{errors.general}</p>}
              <button type="submit">{editMode ? 'Update' : 'Create'} Matchup</button>
            </>
          )}
        </form>
      )}

{selectedTab === 'viewTeams' && (
  <div className="list">
    <h2>Teams</h2>
    {teams.map((team) => (
      <div key={team._id} className="list-item">
        <p>
          <strong>{team.name}</strong> - {team.city} | Wins: {team.wins} | Losses: {team.losses}
        </p>
        <button onClick={() => handleEdit(team, 'team')}>Edit</button>
        {/* <button onClick={() => handleDelete(team._id, 'team')}>Delete</button> */}
      </div>
    ))}
  </div>
)}

{selectedTab === 'viewPlayers' && (
  <div className="list">
    <h2>Players</h2>
    {players.map((player) => (
      <div key={player._id} className="list-item">
        <p>
          <strong>
            {player.firstName} {player.lastName}
          </strong>{' '}
          - {player.position} - Team: {player.team?.name || 'N/A'}
        </p>
          <button onClick={() => handleViewPlayerStats(player)}>
          {selectedPlayerStats && selectedPlayerStats._id === player._id
            ? 'View Less'
            : 'View Stats'}
        </button>
        <button onClick={() => handleEdit(player, 'player')}>Edit</button>


        {selectedPlayerStats && selectedPlayerStats._id === player._id && (
          <div className="player-stats">
            <h3>Player Stats</h3>
            <p>Games Played: {player.stats?.gamesPlayed || 0}</p>
            <p>Points: {player.stats?.points || 0}</p>
            <p>Assists: {player.stats?.assists || 0}</p>
            <p>Rebounds: {player.stats?.rebounds || 0}</p>
            <p>Steals: {player.stats?.steals || 0}</p>
            <p>Blocks: {player.stats?.blocks || 0}</p>
          </div>
        )}
      </div>
    ))}
  </div>
)}

{selectedTab === 'viewMatchups' && (
  <div className="list">
    <h2>Matchups</h2>
    {matchups.map((matchup) => (
      <div key={matchup._id} className="list-item">
        <p>
          <strong>
            {matchup.homeTeam?.name || 'N/A'} vs {matchup.awayTeam?.name || 'N/A'}
          </strong>{' '}
          - {new Date(matchup.date).toLocaleString()} at {matchup.location}
        </p>
        {matchup.simulated && (
          <p>
            Score:{' '}
            {matchup.homeTeamScore > matchup.awayTeamScore ? (
              <strong>
                {matchup.homeTeam?.name || 'N/A'} ({matchup.homeTeamScore})
              </strong>
            ) : (
              <>
                {matchup.homeTeam?.name || 'N/A'} ({matchup.homeTeamScore})
              </>
            )}{' '}
            -{' '}
            {matchup.awayTeamScore > matchup.homeTeamScore ? (
              <strong>
                {matchup.awayTeam?.name || 'N/A'} ({matchup.awayTeamScore})
              </strong>
            ) : (
              <>
                {matchup.awayTeam?.name || 'N/A'} ({matchup.awayTeamScore})
              </>
            )}
          </p>
        )}
        {!matchup.simulated && (
          <>
            <button onClick={() => handleEdit(matchup, 'matchup')}>Edit</button>
            <button onClick={() => handleDelete(matchup._id, 'matchup')}>Delete</button>
          </>
        )}
        {!matchup.simulated ? (
          <button
            onClick={() => handleSimulate(matchup._id)}
            disabled={simulatingGameIds.includes(matchup._id)}
          >
            {simulatingGameIds.includes(matchup._id) ? 'Loading...' : 'Simulate'}
          </button>
        ) : (
          <button onClick={() => handleViewStats(matchup)}>
            {selectedMatchupStats && selectedMatchupStats._id === matchup._id
              ? 'View Less'
              : 'View Stats'}
          </button>
        )}

        {selectedMatchupStats && selectedMatchupStats._id === matchup._id && (
          <div className="stats-table">
            <h3>Player Stats</h3>
            <table>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Team</th>
                  <th>Points</th>
                  <th>Assists</th>
                  <th>Rebounds</th>
                  <th>Steals</th>
                  <th>Blocks</th>
                </tr>
              </thead>
              <tbody>
                {selectedMatchupStats.playerStats.map((stat) => (
                  <tr key={stat.player._id}>
                    <td>
                      {stat.player.firstName} {stat.player.lastName}
                    </td>
                    <td>{stat.team.name}</td>
                    <td>{stat.points}</td>
                    <td>{stat.assists}</td>
                    <td>{stat.rebounds}</td>
                    <td>{stat.steals}</td>
                    <td>{stat.blocks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    ))}
  </div>
)}

{selectedTab === 'leaderboard' && (
  <div className="leaderboard">
    <h2>Player Statistics</h2>
    <div className="controls">
      <label>
        Sort By:
        <select value={sortField} onChange={(e) => setSortField(e.target.value)}>
          <option value="points">Points</option>
          <option value="assists">Assists</option>
          <option value="rebounds">Rebounds</option>
          <option value="steals">Steals</option>
          <option value="blocks">Blocks</option>
        </select>
      </label>
      <label>
        Per Game:
        <input
          type="checkbox"
          checked={perGame}
          onChange={(e) => setPerGame(e.target.checked)}
        />
      </label>
      <label>
        Order:
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </label>
    </div>
    <table className="stats-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Team</th>
          <th>Games Played</th>
          <th>{perGame ? 'Avg ' : 'Total '}Points</th>
          <th>{perGame ? 'Avg ' : 'Total '}Assists</th>
          <th>{perGame ? 'Avg ' : 'Total '}Rebounds</th>
          <th>{perGame ? 'Avg ' : 'Total '}Steals</th>
          <th>{perGame ? 'Avg ' : 'Total '}Blocks</th>
        </tr>
      </thead>
      <tbody>
        {playerStats.map((player, index) => (
          <tr key={player._id}>
            <td>{index + 1}</td>
            <td>
              {player.firstName} {player.lastName}
            </td>
            <td>{player.team?.name || 'N/A'}</td>
            <td>{player.stats?.gamesPlayed}</td>
            <td>
              {perGame
                ? (player.perGameStats?.points || 0).toFixed(2)
                : player.stats?.points}
            </td>
            <td>
              {perGame
                ? (player.perGameStats?.assists || 0).toFixed(2)
                : player.stats?.assists}
            </td>
            <td>
              {perGame
                ? (player.perGameStats?.rebounds || 0).toFixed(2)
                : player.stats?.rebounds}
            </td>
            <td>
              {perGame
                ? (player.perGameStats?.steals || 0).toFixed(2)
                : player.stats?.steals}
            </td>
            <td>
              {perGame
                ? (player.perGameStats?.blocks || 0).toFixed(2)
                : player.stats?.blocks}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}




     

   
   
    </div>
  
  );
}