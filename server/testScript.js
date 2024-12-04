const axios = require('axios');
const API_URL = 'http://localhost:5001/api'; 

async function createTeam(name, city) {
  try {
    const response = await axios.post(`${API_URL}/teams`, { name, city });
    console.log(`Team created: ${response.data.name}`);
    return response.data._id;
  } catch (error) {
    console.error('Error creating team:', error.response?.data || error.message);
  }
}

async function createPlayer(firstName, lastName, position, team, heightCm, weightLbs, skill) {
  try {
    const response = await axios.post(`${API_URL}/players`, {
      firstName,
      lastName,
      position,
      team,
      heightCm,
      weightLbs,
      skill,
    });
    console.log(`Player created: ${response.data.firstName} ${response.data.lastName}`);
  } catch (error) {
    console.error('Error creating player:', error.response?.data || error.message);
  }
}

async function runTestScript() {
  // Create two teams
  const team1Id = await createTeam('Los Angeles Fakers', 'Los Angeles');
  const team2Id = await createTeam('Golden Steak Warriors', 'San Francisco');

  if (!team1Id || !team2Id) {
    console.error('Failed to create teams. Exiting test script.');
    return;
  }

  // Define players for Team 1
  const team1Players = [
    { firstName: 'LeBurn', lastName: 'Flames', position: 'SF', heightCm: 206, weightLbs: 250, skill: 95 },
    { firstName: 'Anthony', lastName: 'PaperDavis', position: 'PF', heightCm: 208, weightLbs: 253, skill: 90 },
    { firstName: 'Bronny', lastName: 'Games', position: 'PG', heightCm: 191, weightLbs: 200, skill: 88 },
    { firstName: 'Austin', lastName: 'Weeves', position: 'SG', heightCm: 196, weightLbs: 197, skill: 80 },
    { firstName: 'Jarred', lastName: 'Vanderbolt', position: 'PF', heightCm: 203, weightLbs: 214, skill: 85 },
  ];

  // Define players for Team 2
  const team2Players = [
    { firstName: 'Stef', lastName: 'Carry', position: 'PG', heightCm: 188, weightLbs: 185, skill: 96 },
    { firstName: 'Clay', lastName: 'Tons', position: 'SG', heightCm: 198, weightLbs: 215, skill: 90 },
    { firstName: 'Draymom', lastName: 'Mean', position: 'PF', heightCm: 198, weightLbs: 230, skill: 89 },
    { firstName: 'Andrew', lastName: 'Whiskens', position: 'SF', heightCm: 201, weightLbs: 197, skill: 85 },
    { firstName: 'Kevon', lastName: 'Mooney', position: 'C', heightCm: 206, weightLbs: 245, skill: 82 },
  ];

  // Create players for Team 1
  for (const player of team1Players) {
    await createPlayer(
      player.firstName,
      player.lastName,
      player.position,
      team1Id,
      player.heightCm,
      player.weightLbs,
      player.skill
    );
  }

  // Create players for Team 2
  for (const player of team2Players) {
    await createPlayer(
      player.firstName,
      player.lastName,
      player.position,
      team2Id,
      player.heightCm,
      player.weightLbs,
      player.skill
    );
  }

  console.log('Test script completed!');
}

runTestScript();