(function() {
  const ui = {
    latestScore: document.getElementById('latestScore'),
    quarterGrowth: document.getElementById('quarterGrowth'),
    latestQuarter: document.getElementById('latestQuarter'),
    topPerformer: document.getElementById('topPerformer'),
    topImprover: document.getElementById('topImprover'),
    atRisk: document.getElementById('atRisk'),
    avgImprove: document.getElementById('avgImprove'),
    playerCount: document.getElementById('playerCount'),
    totalPlayers: document.getElementById('totalPlayers'), 
    coachInsight: document.getElementById('coachInsight'),
    lastUpdated: document.getElementById('lastUpdated'),
    statusBox: document.getElementById('statusBox'),
    resetDemoBtn: document.getElementById('resetDemoBtn'),
    trendCanvas: document.getElementById('trendChart'),
    riskCanvas: document.getElementById('riskChart')
  };

  let charts = {
    trend: null,
    risk: null
  };

  function showStatus(message, isError = true) {
    if(!ui.statusBox) return;
    ui.statusBox.style.display = 'block';
    ui.statusBox.className = 'status-box';
    if (!isError) {
      ui.statusBox.style.background = 'rgba(91, 227, 168, 0.15)';
      ui.statusBox.style.borderColor = '#5be3a8';
      ui.statusBox.style.color = '#d8ffe8';
    }
    ui.statusBox.innerText = message;
  }

  function formatValue(val, suffix = '') {
    if (val === undefined || val === null) return '--';
    const num = Number(val);
    if (isNaN(num)) return val;
    return num.toFixed(1) + suffix;
  }

  function formatPlayer(player, isImprover = false) {
    if (!player) return '--';
    let valToShow = 0;
    if (isImprover) {
        valToShow = player.improvementPct || player.improvement_pct || player.improvement || 0;
        return `${player.name || 'Unknown'} (+${formatValue(valToShow, '%')})`;
    } else {
        valToShow = player.overallScore || player.overall_score || player.avg_score || player.score || player.latestScore || 0;
        return `${player.name || 'Unknown'} (${formatValue(valToShow)})`;
    }
  }

  function initTrendChart(data) {
    if (!Array.isArray(data)) data = [];
    if (charts.trend) charts.trend.destroy();
    
    // SMART LABELS: If backend drops the name, force sequential quarters
    const labels = data.length > 0 ? data.map((item, index) => {
        return item.quarter || item.quarterlyCycle || item.quarterly_cycle || item.cycle || item.name || `Q${index + 1} 2026`;
    }) : ['No Data'];
    
    const values = data.length > 0 ? data.map(item => Number(item.avg_score || item.averageOverallScore || item.average_overall_score || item.overall_score || item.score || 0)) : [null];

    const ctx = ui.trendCanvas.getContext('2d');
    charts.trend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Avg Score',
          data: values,
          borderColor: '#d4af37',
          backgroundColor: 'rgba(212, 175, 55, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 3,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 100, ticks: { color: '#b9c7d8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { ticks: { color: '#b9c7d8' }, grid: { display: false } }
        }
      }
    });
    charts.trend.update();
  }

  function initRiskChart(atRiskCount, totalCount) {
    if (charts.risk) charts.risk.destroy();

    const atRisk = Number(atRiskCount) || 0;
    const total = Number(totalCount) || 0;
    const onTrack = Math.max(0, total - atRisk);
    
    const dataValues = total === 0 ? [1] : [atRisk, onTrack];
    const bgColors = total === 0 ? ['#555'] : ['#ff6b6b', '#5be3a8'];
    const chartLabels = total === 0 ? ['No Data'] : ['At Risk', 'On Track'];

    const ctx = ui.riskCanvas.getContext('2d');
    charts.risk = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: chartLabels,
        datasets: [{
          data: dataValues,
          backgroundColor: bgColors,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#b9c7d8' } }
        },
        cutout: '70%'
      }
    });
    charts.risk.update();
  }

  async function loadDashboard() {
    if (!SWPI.getToken()) {
      window.location.href = 'login.html';
      return;
    }

    try {
      // Fetch players list so frontend can calculate missing stats
      const [summaryData, trendData, playersData] = await Promise.all([
        SWPI.fetchDashboard().catch(() => ({})),
        SWPI.fetchTrend().catch(() => []),
        SWPI.fetchPlayers().catch(() => [])
      ]);

      let summary = summaryData;
      if (summaryData && summaryData.data) summary = summaryData.data;
      if (summary.summary) summary = summary.summary;
      
      let trend = [];
      if (Array.isArray(trendData)) trend = trendData;
      else if (trendData && Array.isArray(trendData.data)) trend = trendData.data;
      else if (trendData && trendData.data && Array.isArray(trendData.data.trend)) trend = trendData.data.trend;
      else if (trendData && Array.isArray(trendData.trend)) trend = trendData.trend;

      let players = [];
      if (Array.isArray(playersData)) players = playersData;
      else if (playersData && Array.isArray(playersData.data)) players = playersData.data;

      // ---------------------------------------------------------
      // CALCULATE MISSING STATS (Frontend Override)
      // ---------------------------------------------------------
      let calcTopPerformer = null;
      let calcTopImprover = null;

      if (players.length > 0) {
          // Find Top Performer
          const sortedByScore = [...players].sort((a, b) => {
              const sA = Number(a.overall_score || a.latestScore || a.overallScore || 0);
              const sB = Number(b.overall_score || b.latestScore || b.overallScore || 0);
              return sB - sA; 
          });
          calcTopPerformer = sortedByScore[0];

          // Find Top Improver
          const sortedByImp = [...players].sort((a, b) => {
              const iA = Number(a.improvement_pct || a.improvementPct || a.improvement || 0);
              const iB = Number(b.improvement_pct || b.improvementPct || b.improvement || 0);
              return iB - iA;
          });
          calcTopImprover = sortedByImp[0];
      }

      const latestScore = summary.avg_score || summary.latestScore || summary.averageScore || 0;
      if(ui.latestScore) ui.latestScore.innerText = formatValue(latestScore);

      const growth = summary.quarterGrowthPct || summary.quarter_growth_pct || summary.growth || 0;
      if(ui.quarterGrowth) {
          ui.quarterGrowth.innerText = (growth > 0 ? '+' : '') + formatValue(growth, '%');
          ui.quarterGrowth.style.color = growth >= 0 ? '#5be3a8' : '#ff6b6b';
      }

      if(ui.latestQuarter) ui.latestQuarter.innerText = summary.latestQuarterlyCycle || summary.quarter || 'Q1 2026';
      
      // Use the calculated fallback if backend leaves it blank
      const topPerformer = summary.topPerformer || summary.top_performer || calcTopPerformer;
      const topImprover = summary.topImprover || summary.top_improver || calcTopImprover;

      if(ui.topPerformer) ui.topPerformer.innerText = formatPlayer(topPerformer, false);
      if(ui.topImprover) ui.topImprover.innerText = formatPlayer(topImprover, true);

      const atRisk = summary.at_risk || summary.atRiskPlayers || 0;
      if(ui.atRisk) {
          ui.atRisk.innerText = atRisk;
          ui.atRisk.style.color = atRisk > 0 ? '#ff6b6b' : '#5be3a8';
      }

      const avgImprove = summary.averageImprovementPct || summary.avg_improvement || summary.improvement || 0;
      if(ui.avgImprove) ui.avgImprove.innerText = formatValue(avgImprove, '%');

      const playerCount = summary.total_players || summary.playerCount || players.length || 0;
      if(ui.playerCount) ui.playerCount.innerText = playerCount;
      if(ui.totalPlayers) ui.totalPlayers.innerText = playerCount; 

      // Update Insight
      if(ui.coachInsight) {
          if (atRisk > 0) {
            ui.coachInsight.innerText = `${atRisk} players identified as 'At Risk'. Prioritize skill-focused drills for the squad.`;
            ui.coachInsight.style.color = '#ff6b6b';
          } else {
            ui.coachInsight.innerText = `Squad performance is stable. Continue consistent quarterly assessments.`;
            ui.coachInsight.style.color = '#5be3a8';
          }
      }
      
      if(ui.lastUpdated) ui.lastUpdated.innerText = `Last updated: ${new Date().toLocaleString()}`;

      // Initialize Charts
      initTrendChart(trend);
      initRiskChart(atRisk, playerCount);

    } catch (err) {
      console.error("Dashboard Load Error:", err);
      showStatus("Failed to load dashboard data. Please check your connection.");
    }
  }

  if(ui.resetDemoBtn) {
      ui.resetDemoBtn.addEventListener('click', async () => {
        if (!confirm('This will reset the database to 15 demo players. Proceed?')) return;
        
        ui.resetDemoBtn.disabled = true;
        ui.resetDemoBtn.innerText = 'Resetting...';

        try {
          await SWPI.resetDemoData();
          showStatus("Demo data reset successfully!", false);
          await loadDashboard(); 
        } catch (err) {
          console.error(err);
          const details = (err.response && err.response.details) ? `\nDetails: ${err.response.details}` : '';
          showStatus("Reset failed: " + err.message + details);
        } finally {
          ui.resetDemoBtn.disabled = false;
          ui.resetDemoBtn.innerText = 'Reset Demo Data (15 Players)';
        }
      });
  }

  loadDashboard();
})();