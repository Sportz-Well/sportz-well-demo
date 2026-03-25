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
    totalPlayers: document.getElementById('totalPlayers'), // Added safety catch
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

  function formatPlayer(player) {
    if (!player) return '--';
    const score = player.overallScore || player.overall_score || player.avg_score || player.improvementPct || player.improvement_pct;
    return `${player.name || 'Unknown'} (${formatValue(score)})`;
  }

  function initTrendChart(data) {
    if (!Array.isArray(data)) data = [];
    if (charts.trend) charts.trend.destroy();
    
    // EXACT MATCH for your Trend API Raw log
    const labels = data.length > 0 ? data.map(item => item.quarter || item.quarterlyCycle || item.quarterly_cycle || 'Q') : ['No Data'];
    const values = data.length > 0 ? data.map(item => Number(item.avg_score || item.averageOverallScore || item.average_overall_score || item.overall_score || 0)) : [null];

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
      const [summaryData, trendData] = await Promise.all([
        SWPI.fetchDashboard(),
        SWPI.fetchTrend()
      ]);

      let summary = summaryData;
      if (summaryData && summaryData.data) summary = summaryData.data;
      if (summary.summary) summary = summary.summary;
      
      let trend = [];
      if (Array.isArray(trendData)) trend = trendData;
      else if (trendData && Array.isArray(trendData.data)) trend = trendData.data;
      else if (trendData && trendData.data && Array.isArray(trendData.data.trend)) trend = trendData.data.trend;
      else if (trendData && Array.isArray(trendData.trend)) trend = trendData.trend;

      // ---------------------------------------------------------
      // EXACT DICTIONARY MATCH based on your screenshot
      // {success: true, total_players: 15, avg_score: 67, at_risk: 4}
      // ---------------------------------------------------------

      const latestScore = summary.avg_score || summary.latestScore || 0;
      if(ui.latestScore) ui.latestScore.innerText = formatValue(latestScore);

      const growth = summary.quarterGrowthPct || summary.quarter_growth_pct || summary.growth || 0;
      if(ui.quarterGrowth) {
          ui.quarterGrowth.innerText = (growth > 0 ? '+' : '') + formatValue(growth, '%');
          ui.quarterGrowth.style.color = growth >= 0 ? '#5be3a8' : '#ff6b6b';
      }

      if(ui.latestQuarter) ui.latestQuarter.innerText = summary.latestQuarterlyCycle || summary.quarter || 'Q3 2026';
      
      if(ui.topPerformer) ui.topPerformer.innerText = formatPlayer(summary.topPerformer || summary.top_performer);
      if(ui.topImprover) ui.topImprover.innerText = formatPlayer(summary.topImprover || summary.top_improver);

      const atRisk = summary.at_risk || summary.atRiskPlayers || 0;
      if(ui.atRisk) {
          ui.atRisk.innerText = atRisk;
          ui.atRisk.style.color = atRisk > 0 ? '#ff6b6b' : '#5be3a8';
      }

      const avgImprove = summary.averageImprovementPct || summary.avg_improvement || summary.improvement || 0;
      if(ui.avgImprove) ui.avgImprove.innerText = formatValue(avgImprove, '%');

      const playerCount = summary.total_players || summary.playerCount || 0;
      if(ui.playerCount) ui.playerCount.innerText = playerCount;
      if(ui.totalPlayers) ui.totalPlayers.innerText = playerCount; // Safety catch

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