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
    return `${player.name || 'Unknown'} (${formatValue(player.overallScore || player.improvementPct)})`;
  }

  function initTrendChart(data) {
    if (!Array.isArray(data)) return;
    if (charts.trend) charts.trend.destroy();
    
    const labels = data.length > 0 ? data.map(item => item.quarterlyCycle || item.quarter || item.quarterly_cycle || 'Unknown') : ['No Data'];
    const values = data.length > 0 ? data.map(item => item.averageOverallScore || item.overall_score || item.average_overall_score || 0) : [null];

    charts.trend = new Chart(ui.trendCanvas, {
      type: 'line',
      data: {
        labels,
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

    charts.risk = new Chart(ui.riskCanvas, {
      type: 'doughnut',
      data: {
        labels: ['At Risk', 'On Track'],
        datasets: [{
          data: [atRisk, onTrack],
          backgroundColor: ['#ff6b6b', '#5be3a8'],
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

      console.log('Dashboard API Response:', summaryData);
      console.log('Trend API Response:', trendData);

      const summary = summaryData.data?.summary || summaryData.summary || summaryData || {};
      const trend = trendData.data?.trend || trendData.trend || (Array.isArray(trendData) ? trendData : []);

      // Update Cards
      const latestScore = summary.latestScore || summary.latest_score || 0;
      ui.latestScore.innerText = formatValue(latestScore);

      const growth = summary.quarterGrowthPct || summary.quarter_growth_pct || summary.quarterGrowth || summary.quarter_growth || 0;
      ui.quarterGrowth.innerText = (growth > 0 ? '+' : '') + formatValue(growth, '%');
      ui.quarterGrowth.style.color = growth >= 0 ? '#5be3a8' : '#ff6b6b';

      ui.latestQuarter.innerText = summary.latestQuarterlyCycle || summary.latest_quarterly_cycle || summary.quarter || '--';
      
      const topPerformer = summary.topPerformer || summary.top_performer;
      ui.topPerformer.innerText = formatPlayer(topPerformer);

      const topImprover = summary.topImprover || summary.top_improver;
      ui.topImprover.innerText = formatPlayer(topImprover);

      const atRisk = summary.atRiskPlayers || summary.at_risk_players || summary.atRiskCount || summary.at_risk_count || 0;
      ui.atRisk.innerText = atRisk;
      ui.atRisk.style.color = atRisk > 0 ? '#ff6b6b' : '#5be3a8';

      const avgImprove = summary.averageImprovementPct || summary.average_improvement_pct || summary.avg_improvement || 0;
      ui.avgImprove.innerText = formatValue(avgImprove, '%');

      const playerCount = summary.playerCount || summary.player_count || 0;
      ui.playerCount.innerText = playerCount;

      // Update Insight
      if (atRisk > 0) {
        ui.coachInsight.innerText = `${atRisk} players identified as 'At Risk'. Prioritize skill-focused drills for the U14 squad.`;
      } else {
        ui.coachInsight.innerText = `Squad performance is stable. Continue consistent quarterly assessments.`;
      }
      ui.lastUpdated.innerText = `Last updated: ${new Date().toLocaleString()}`;

      // Initialize Charts
      initTrendChart(trend);
      initRiskChart(atRisk, playerCount);

    } catch (err) {
      console.error(err);
      showStatus("Failed to load dashboard data. Please check your connection.");
    }
  }

  ui.resetDemoBtn.addEventListener('click', async () => {
    if (!confirm('This will reset the database to 15 demo players. Proceed?')) return;
    
    ui.resetDemoBtn.disabled = true;
    ui.resetDemoBtn.innerText = 'Resetting...';

    try {
      await SWPI.resetDemoData();
      showStatus("Demo data reset successfully!", false);
      await loadDashboard();
      ui.resetDemoBtn.disabled = false;
      ui.resetDemoBtn.innerText = 'Reset Demo Data (15 Players)';
    } catch (err) {
      console.error(err);
      const details = (err.response && err.response.details) ? `\nDetails: ${err.response.details}` : '';
      showStatus("Reset failed: " + err.message + details);
      ui.resetDemoBtn.disabled = false;
      ui.resetDemoBtn.innerText = 'Reset Demo Data (15 Players)';
    }
  });

  loadDashboard();
})();
