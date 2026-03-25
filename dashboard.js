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
    
    const labels = data.map(item => item.quarterlyCycle || item.quarter);
    const values = data.map(item => item.averageOverallScore || item.overall_score);

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
  }

  function initRiskChart(atRiskCount, totalCount) {
    if (charts.risk) charts.risk.destroy();

    charts.risk = new Chart(ui.riskCanvas, {
      type: 'doughnut',
      data: {
        labels: ['At Risk', 'On Track'],
        datasets: [{
          data: [atRiskCount, totalCount - atRiskCount],
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

      const summary = summaryData.data?.summary || summaryData || {};
      const trend = trendData.data?.trend || trendData || [];

      // Update Cards
      ui.latestScore.innerText = formatValue(summary.latestScore);
      ui.quarterGrowth.innerText = (summary.quarterGrowthPct > 0 ? '+' : '') + formatValue(summary.quarterGrowthPct, '%');
      ui.quarterGrowth.style.color = summary.quarterGrowthPct >= 0 ? '#5be3a8' : '#ff6b6b';
      ui.latestQuarter.innerText = summary.latestQuarterlyCycle || '--';
      ui.topPerformer.innerText = formatPlayer(summary.topPerformer);
      ui.topImprover.innerText = formatPlayer(summary.topImprover);
      ui.atRisk.innerText = summary.atRiskPlayers || 0;
      ui.atRisk.style.color = summary.atRiskPlayers > 0 ? '#ff6b6b' : '#5be3a8';
      ui.avgImprove.innerText = formatValue(summary.averageImprovementPct, '%');
      ui.playerCount.innerText = summary.playerCount || 0;

      // Update Insight
      const risk = summary.atRiskPlayers || 0;
      if (risk > 0) {
        ui.coachInsight.innerText = `${risk} players identified as 'At Risk'. Prioritize skill-focused drills for the U14 squad.`;
      } else {
        ui.coachInsight.innerText = `Squad performance is stable. Continue consistent quarterly assessments.`;
      }
      ui.lastUpdated.innerText = `Last updated: ${new Date().toLocaleString()}`;

      // Initialize Charts
      initTrendChart(trend);
      initRiskChart(summary.atRiskPlayers || 0, summary.playerCount || 0);

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
      setTimeout(() => location.reload(), 1500);
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
