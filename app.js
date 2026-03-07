async function loadDashboard(){

const dashboardElement = document.getElementById("latestScore");

if(!dashboardElement){
return;
}

const token = localStorage.getItem("token");

const res = await fetch("http://localhost:5000/api/dashboard",{
headers:{
Authorization:"Bearer " + token
}
});

const data = await res.json();

document.getElementById("latestScore").innerText = data.latestScore;
document.getElementById("topImprover").innerText = data.topImprover;
document.getElementById("atRisk").innerText = data.atRisk;
document.getElementById("avgImprove").innerText = data.avgImprove;

loadRiskChart();

}

function loadRiskChart(){

const chartCanvas = document.getElementById("riskChart");

if(!chartCanvas){
return;
}

const ctx = chartCanvas.getContext("2d");

new Chart(ctx,{
type:"pie",
data:{
labels:["Low Risk","Medium Risk","High Risk"],
datasets:[{
data:[12,7,6],
backgroundColor:["#3498db","#e74c3c","#f39c12"]
}]
}
});

}

async function loadPlayers(){

const tableBody = document.getElementById("playersTableBody");

if(!tableBody){
return;
}

const token = localStorage.getItem("token");

const res = await fetch("http://localhost:5000/api/players",{
headers:{
Authorization:"Bearer " + token
}
});

const players = await res.json();

tableBody.innerHTML = "";

players.forEach(player => {

const row = `
<tr>
<td><a href="player-profile.html?id=${player.id}">${player.name}</a></td>
<td>${player.age}</td>
<td>${player.role}</td>
<td>${player.latest_score}</td>
<td>${player.improvement_pct}%</td>
<td>${player.status}</td>
</tr>
`;

tableBody.innerHTML += row;

});

}

loadDashboard();
loadPlayers();