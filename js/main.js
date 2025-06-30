(async function() {

    let password = localStorage.getItem('dashboard_password');
    
    if (!password) {
    
        password = window.prompt('Enter password:');
        if (!password) return;
        localStorage.setItem('dashboard_password', password);
    
    }

    // console.log(password);
    
    try {
    
        // ---------------------------------------------------------------------
        // ---------------------------------------------------------------------
        // QUOTA VISUALIZATION -------------------------------------------------
        // ---------------------------------------------------------------------

        let res = await fetch('https://buildup-mongo-api-production.up.railway.app/dashboard', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "password": password
            })
        });

        // console.log(res);
    
        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                localStorage.removeItem('dashboard_password');
                document.body.innerText = 'Invalid password. Please reload and try again.';
                return;
            }
            document.body.innerText = 'Error: ' + res.status + ' ' + res.statusText;
            return;
        }
    
        let data = await res.json();

        console.log(data)
        
        // Group data by platform and province
        const groupedData = {};
        data.quotas.forEach(item => {
            if (!groupedData[item.platform]) {
                groupedData[item.platform] = {};
            }
            if (!groupedData[item.platform][item.province]) {
                groupedData[item.platform][item.province] = [];
            }
            groupedData[item.platform][item.province].push(item);
        });

        function renderQuotasTable(showRaw) {
            const gridContainer = document.querySelector('.quota-grid');
            let html = '';
            // Define display order and labels
            const platformOrder = [
                'x', 'facebook', 'instagram', 'youtube', 'tiktok'
            ];
            const platformLabels = {
                'x': 'X',
                'facebook': 'Facebook',
                'instagram': 'Instagram',
                'youtube': 'YouTube',
                'tiktok': 'TikTok'
            };
            const provinceOrder = [
                'nairobi', 'central', 'coast', 'eastern', 'north-eastern', 'nyanza', 'rift-valley', 'western'
            ];
            const provinceLabels = {
                'nairobi': 'Nairobi',
                'central': 'Central',
                'coast': 'Coast',
                'eastern': 'Eastern',
                'north-eastern': 'North Eastern',
                'nyanza': 'Nyanza',
                'rift-valley': 'Rift Valley',
                'western': 'Western'
            };
            const genderOrder = ['female', 'male', 'non-binary'];
            const genderLabels = {
                'female': 'F',
                'male': 'M',
                'non-binary': 'NB'
            };
            platformOrder.forEach(platform => {
                if (!groupedData[platform]) return;
                html += `<div class="platform-container">`;
                html += `<h2>${platformLabels[platform]}</h2>`;
                provinceOrder.forEach(province => {
                    if (!groupedData[platform][province]) return;
                    html += `<h3>${provinceLabels[province]}</h3>`;
                    const items = groupedData[platform][province];
                    const ages = [...new Set(items.map(item => item.age))].sort();
                    html += '<table>';
                    html += '<tr><th></th>';
                    ages.forEach(age => {
                        html += `<th>${age}</th>`;
                    });
                    html += '</tr>';
                    genderOrder.forEach(gender => {
                        html += '<tr>';
                        html += `<td>${genderLabels[gender]}</td>`;
                        ages.forEach(age => {
                            const item = items.find(i => i.age === age && i.gender === gender);
                            let cellStyle = '';
                            let cellContent = '.';
                            if (item) {
                                const percentage = Math.round((item.count / item.quota) * 100);
                                if (showRaw) {
                                    cellContent = `${item.count} / ${item.quota}`;
                                } else {
                                    cellContent = `${percentage}%`;
                                }
                                if (percentage === 0) {
                                    cellStyle = 'background-color: #ffe6e6; color: #cc0000';
                                } else if (percentage < 100) {
                                    const opacity = percentage / 100;
                                    cellStyle = `background-color: rgba(0, 0, 255, ${opacity})`;
                                } else {
                                    cellStyle = 'background-color: #e6ffe6; color: #006600';
                                }
                            }
                            html += `<td style="${cellStyle}">${cellContent}</td>`;
                        });
                        html += '</tr>';
                    });
                    html += '</table>';
                });
                html += '</div>';
            });
            gridContainer.innerHTML = html;
        }

        // Initial render
        const toggle = document.getElementById('toggle-raw');
        renderQuotasTable(toggle && toggle.checked);
        if (toggle) {
            toggle.addEventListener('change', function() {
                renderQuotasTable(toggle.checked);
            });
        }

        // ---------------------------------------------------------------------
        // ---------------------------------------------------------------------
        // ATTRITION VISUALIZATION ---------------------------------------------
        // ---------------------------------------------------------------------

        function renderAttritionFlow() {
            const steps = [
                { 'key': 'surveyCompletedScreen',       'label': 'Completed screening questions' },
                { 'key': 'eligible',                    'label': 'Eligible' },
                { 'key': 'surveyCompleted',             'label': 'Completed survey' },
                { 'key': 'appPhoneNumberEntered',       'label': 'Entered phone number in app' },
                { 'key': 'appPlatformLoggedIn',         'label': 'Logged in to platform' },
                { 'key': 'appDataReceived',             'label': 'Platform data received' },
                { 'key': 'paid',                        'label': 'Paid' }
            ];
            
            const platformOrder = [
                'x', 'facebook', 'instagram', 'youtube', 'tiktok'
            ];
            const platformLabels = {
                'x': 'X',
                'facebook': 'Facebook',
                'instagram': 'Instagram',
                'youtube': 'YouTube',
                'tiktok': 'TikTok'
            };
            
            let html = '<table class="attrition-table">';
            
            // Header row with step labels
            html += '<tr><th></th>';
            steps.forEach((step, index) => {
                html += `<th>${step.label}</th>`;
                if (index < steps.length - 1) {
                    html += '<th class="attrition-header">↓</th>';
                }
            });
            html += '</tr>';
            
            // Data rows for each platform
            platformOrder.forEach(platform => {
                if (!data.attrition[platform]) return;
                
                html += '<tr>';
                html += `<td class="platform-name">${platformLabels[platform]}</td>`;
                
                // Get counts for this platform
                let counts = [];
                steps.forEach(step => {
                    const count = data.attrition[platform][step.key] || 0;
                    counts.push(count);
                });
                
                // Calculate attrition percentages between steps
                let attritions = [];
                for (let i = 1; i < counts.length; i++) {
                    if (counts[i-1] > 0) {
                        let perc = Math.round(((counts[i-1] - counts[i]) / counts[i-1]) * 100);
                        attritions.push(perc);
                    } else {
                        attritions.push(0);
                    }
                }
                
                // Add count cells and attrition cells
                steps.forEach((step, index) => {
                    html += `<td class="count-cell">${counts[index]}</td>`;
                    if (index < steps.length - 1) {
                        const attr = attritions[index];
                        const attrClass = attr > 0 ? 'attrition-loss' : 'attrition-gain';
                        html += `<td class="attrition-cell ${attrClass}">${attr > 0 ? '-' : '+'}${Math.abs(attr)}%</td>`;
                    }
                });
                
                html += '</tr>';
            });
            
            html += '</table>';
            
            const grid = document.querySelector('.attrition-grid');
            grid.innerHTML = html;
        }
        renderAttritionFlow();
    
    } catch (e) {
    
        document.body.innerText = 'Request failed: ' + e;
    
    }
})(); 