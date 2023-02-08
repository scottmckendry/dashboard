
// Search engine - can be replaced with URL of choice
var search = "https://search.brave.com/search?";
var query = "q";

// initialising vars for the bits I didn't write lol
var pivotmatch = 0;
var totallinks = 0;
var prevregexp = "";

// Configuration import
function importConfig(path) {
	// Set the global configs to synchronous 
	$.ajaxSetup({
		async: false
	});
	var configJson = $.getJSON(path).done()
	// Set the global configs back to asynchronous 
	$.ajaxSetup({
		async: true
	});
	return configJson;
}
configJson = importConfig("../config.json");
var sites = configJson.responseJSON.Bookmarks;

// Didn't write this function or matchinfo - came from another project I worked on ages ago. No idea where it came from before that.
// My understanding is this takes the input from "document.onkeydown..." and returns the matching link.
function matchLinks(regex = prevregexp) {
	totallinks = 0;
	pivotmatch = regex == prevregexp ? pivotmatch : 0;
	prevregexp = regex;
	pivotbuffer = pivotmatch;
	p = document.getElementById("links");
	while (p.firstChild) {
		p.removeChild(p.firstChild);
	}
	match = new RegExp(regex ? regex : ".", "i");
	gmatches = false;
	for (i = 0; i < Object.keys(sites).length; i++) {
		matches = false;
		sn = Object.keys(sites)[i];
		section = document.createElement("div");
		section.id = sn;
		section.className = "section";

		//Create header
		sectionHeader = document.createElement("p");
		sectionHeader.innerHTML = sn;
		section.appendChild(sectionHeader);

		// Create links
		inner = document.createElement("div");
		for (l = 0; l < Object.keys(sites[sn]).length; l++) {
			ln = Object.keys(sites[sn])[l];
			if (match.test(ln)) {
				link = document.createElement("a");
				link.href = sites[sn][ln];
				link.innerHTML = ln;
				link.target = "_blank"
				if (!pivotbuffer++ && regex != "") {
					link.className = "selected";
					document.getElementById("action").action = sites[sn][ln];
					document.getElementById("action").children[0].removeAttribute("name");
				}
				inner.appendChild(link);
				matches = true;
				gmatches = true;
				totallinks++;
			}
		}
		section.appendChild(inner);
		matches ? p.appendChild(section) : false;
	}
	if (!gmatches || regex == "") {
		document.getElementById("action").action = search;
		document.getElementById("action").children[0].name = query;
	}
}

// Didn't write this block either - came from the same project as matchlinks() and matchinfo().
document.onkeydown = function (e) {
	switch (e.keyCode) {
		case 38:
			pivotmatch = pivotmatch >= 0 ? 0 : pivotmatch + 1;
			matchLinks();
			break;
		case 40:
			pivotmatch = pivotmatch <= -totallinks + 1 ? -totallinks + 1 : pivotmatch - 1;
			matchLinks();
			break;
		default:
			break;
	}
	document.getElementById("action").children[0].focus();
}

// Ditto - not mine.
document.getElementById("action").children[0].onkeypress = function (e) {
	if (e.key == "ArrowDown" || e.key == "ArrowUp") {
		return false;
	}
}

// See matchlinks() :)
function matchInfo(regex = prevregexp) {
	totallinks = 0;
	pivotmatch = regex == prevregexp ? pivotmatch : 0;
	prevregexp = regex;
	pivotbuffer = pivotmatch;
	p = document.getElementById("info");
	match = new RegExp(regex ? regex : ".", "i");
	gmatches = false;
	for (i = 0; i < Object.keys(sites).length; i++) {
		matches = false;
		sn = Object.keys(sites)[i];
		section = document.createElement("div");
		section.id = sn;
		section.innerHTML = sn;
		section.className = "section";
		inner = document.createElement("div");
		for (l = 0; l < Object.keys(sites[sn]).length; l++) {
			ln = Object.keys(sites[sn])[l];
			if (match.test(ln)) {
				link = document.createElement("a");
				link.href = sites[sn][ln];
				link.innerHTML = ln;
				if (!pivotbuffer++ && regex != "") {
					link.className = "selected";
					document.getElementById("action").action = sites[sn][ln];
					document.getElementById("action").children[0].removeAttribute("name");
				}
				inner.appendChild(link);
				matches = true;
				gmatches = true;
				totallinks++;
			}
		}
		section.appendChild(inner);
	}
}


// Returns metrics from prometheus API for CPU, Mem and Network on host server.
// Requires prometheus and node-exporter
function getPromData() {
	var promConfig = configJson.responseJSON.Prometheus;
	// CPU Usage
	$.getJSON(`${promConfig.Url}/api/v1/query?query=100%20*%20(1%20-%20avg%20by(instance)(irate(node_cpu_seconds_total{job=%27${promConfig.JobName}%27,mode=%27idle%27,instance=%27${promConfig.NodeExporter}%27}[5m])))`, function (data) {
		var cpuOutput = data.data.result[0].value[1];
		cpuSanitised = parseFloat(cpuOutput).toFixed(2);
		$("#cpu").html("🕒 " + cpuSanitised + "%");
	});

	// CPU Temp
	$.getJSON(`${promConfig.Url}/api/v1/query?query=node_thermal_zone_temp{zone=%221%22,instance=%27${promConfig.NodeExporter}%27}`, function (data) {
		var tempOutput = data.data.result[0].value[1];
		$("#cpuTemp").html("🌡️ " + tempOutput + "℃");
	});

	// Memory Usage
	$.getJSON(`${promConfig.Url}/api/v1/query?query=100-(avg(node_memory_MemAvailable_bytes)/avg(node_memory_MemTotal_bytes)*100)`, function (data) {
		var memOutput = data.data.result[0].value[1];
		memSanitised = parseFloat(memOutput).toFixed(2);
		$("#memory").html("💾 " + memSanitised + "%");
	});

	//Network
	$.getJSON(`${promConfig.Url}/api/v1/query?query=(rate(node_network_receive_bytes_total{device=%22${promConfig.NetworkInterface}%22}[1m])/1000000)*8`, function (data) {
		var downMbs = data.data.result[0].value[1];
		$.getJSON(`${promConfig.Url}/api/v1/query?query=(rate(node_network_transmit_bytes_total{device=%22${promConfig.NetworkInterface}%22}[1m])/1000000)*8`, function (data) {
			var upMbs = data.data.result[0].value[1];
			downSanitised = parseFloat(downMbs).toFixed(2);
			upSanitised = parseFloat(upMbs).toFixed(2);
			$("#network").html("⬆️" + upSanitised + "  |  ⬇️" + downSanitised);
		});
	});


	// Auto refresh
	setTimeout(getPromData, 5000);
};

function startTime() {
	document.getElementById('clock').innerHTML =
		new Date().toLocaleTimeString('en-nz', { "hour12": false });

	document.getElementById('date').innerHTML =
		new Date().toLocaleDateString('en-nz', { weekday: "long", month: "long", year: "numeric", day: "numeric" });

	setTimeout(startTime, 500);
}

function start() {
	getPromData();
	matchLinks();
	matchInfo();
	startTime();
	getWebStatus();
}

window.onload = start();