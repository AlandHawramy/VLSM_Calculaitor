let isDark = true;
    
function toggleTheme() {
    const body = document.documentElement;
    const themeToggle = document.querySelector('.theme-toggle i');
    
    if (isDark) {
        body.setAttribute('data-theme', 'light');
        themeToggle.className = 'fas fa-sun';
    } else {
        body.removeAttribute('data-theme');
        themeToggle.className = 'fas fa-moon';
    }
    
    isDark = !isDark;
}

function showAlert(message) {
    const alert = document.getElementById('alert');
    alert.textContent = message;
    alert.style.display = 'block';
    alert.style.opacity = 1;

    setTimeout(() => {
        alert.style.opacity = 0;
        setTimeout(() => alert.style.display = 'none', 500);
    }, 3000);
}

function validateIPInput(event) {
    const allowedCharacters = /[0-9.]/;
    const key = String.fromCharCode(event.keyCode || event.which);
    const ipValue = document.getElementById('ipAddress').value;
    const octets = ipValue.split('.');

    if (!allowedCharacters.test(key)) {
        event.preventDefault();
        return;
    }

    if (octets.length > 3 && !ipValue.includes(".")) {
        showAlert('Please enter the IP address correctly with periods separating the octets.');
        event.preventDefault();
    }

    if (octets[octets.length - 1].length === 4 && !ipValue.includes('.')) {
        showAlert('Please add a period (.) after each 3 digits of the octets.');
        event.preventDefault();
    }
}

function validateIPLength(input) {
    const ipValue = input.value;
    const octets = ipValue.split('.');

    if (octets.length > 4 || ipValue.length > 15) {
        showAlert('IP address should have a maximum of 4 octets, separated by periods.');
    }
}

function validateSubnetCount(input) {
    const minSubnets = 1;
    const maxSubnets = 100;
    const numSubnets = parseInt(input.value);

    if (isNaN(numSubnets) || numSubnets < minSubnets || numSubnets > maxSubnets) {
        showAlert(`Please enter a valid number of subnets between ${minSubnets} and ${maxSubnets}`);
        input.value = '';
    }
}

function createLabels() {
    const dynamicLabels = document.getElementById('dynamicLabels');
    dynamicLabels.innerHTML = '';

    const numSubnets = parseInt(document.getElementById('numSubnets').value);
    if (isNaN(numSubnets) || numSubnets < 1 || numSubnets > 100) {
        showAlert("Please enter a valid number of subnets between 1 and 100.");
        return;
    }

    for (let i = 1; i <= numSubnets; i++) {
        const labelGroup = document.createElement('div');
        labelGroup.classList.add('form-group');

        const label = document.createElement('label');
        label.innerText = `Hosts Required for Subnet ${i}:`;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'hostsInput';
        input.placeholder = `Hosts for Subnet ${i}`;
        input.addEventListener('input', () => validateHostsInput(input));

        labelGroup.appendChild(label);
        labelGroup.appendChild(input);
        dynamicLabels.appendChild(labelGroup);
    }

    document.getElementById('calculateBtn').style.display = 'block';
}

function validateHostsInput(input) {
    input.value = input.value.replace(/[^0-9]/g, '');
}

function ipToLong(ip) {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
}

function longToIp(long) {
    return [
        (long >>> 24) & 255,
        (long >>> 16) & 255,
        (long >>> 8) & 255,
        long & 255
    ].join('.');
}

function calculateVLSM() {
    const ipAddress = document.getElementById('ipAddress').value;
    const hostsInputs = document.getElementsByClassName('hostsInput');
    const subnetHosts = Array.from(hostsInputs).map(input => parseInt(input.value)).filter(hosts => !isNaN(hosts));

    if (!validateIp(ipAddress)) {
        showAlert("Please enter a valid IP address.");
        return;
    }

    if (subnetHosts.some(isNaN) || subnetHosts.length === 0) {
        showAlert("Please enter valid hosts for each subnet.");
        return;
    }

    const sortedHosts = subnetHosts.slice().sort((a, b) => b - a);
    const ipLong = ipToLong(ipAddress);
    let currentIPLong = ipLong;

    const results = sortedHosts.map((hosts, index) => {
        const blockSize = calculateBlockSize(hosts);
        const cidr = 32 - calculateBorrowedBits(blockSize);
        const networkAddress = longToIp(currentIPLong);
        const firstHost = longToIp(currentIPLong + 1);
        const lastHost = longToIp(currentIPLong + blockSize - 2);
        const broadcastAddress = longToIp(currentIPLong + blockSize - 1);

        const borrowedBits = calculateBorrowedBits(blockSize);

        const result = {
            subnetNumber: index + 1,
            hosts,
            blockSize,
            cidr,
            borrowedBits,
            networkAddress,
            hostRange: `${firstHost} - ${lastHost}`,
            broadcastAddress
        };
        
        currentIPLong += blockSize;
        return result;
    });

    renderResults(results);
}

function validateIp(ip) {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    return ipRegex.test(ip) && ip.split('.').every(octet => parseInt(octet, 10) <= 255);
}

function calculateBlockSize(hosts) {
    let blockSize = 2;
    while (blockSize - 2 < hosts) {
        blockSize *= 2;
    }
    return blockSize;
}

function calculateBorrowedBits(blockSize) {
    let bits = 0;
    while (1 << bits < blockSize) {
        bits++;
    }
    return bits;
}

function renderResults(results) {
    const resultTable = document.getElementById('resultTable');
    resultTable.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Subnet</th>
                    <th>Hosts Required</th>
                    <th>Block Size</th>
                    <th>CIDR</th>
                    <th>Borrowed Bits</th>
                    <th>Network Address</th>
                    <th>Host Range</th>
                    <th>Broadcast Address</th>
                </tr>
            </thead>
            <tbody>
                ${results.map(result => `
                    <tr>
                        <td>${result.subnetNumber}</td>
                        <td>${result.hosts}</td>
                        <td>${result.blockSize}</td>
                        <td>/${result.cidr}</td>
                        <td>${result.borrowedBits}</td>
                        <td>${result.networkAddress}</td>
                        <td>${result.hostRange}</td>
                        <td>${result.broadcastAddress}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    resultTable.style.display = 'block';
}