data = {};
data.update_server = "https://betaupdate.libremesh.org"

// shows notification if update is available
function info_box(info_output) {
	document.getElementById("info_box").style.display = "block";
	document.getElementById("info_box").innerHTML = info_output;
}

function error_box(error_output) {
	document.getElementById("error_box").style.display = "block";
	document.getElementById("error_box").innerHTML = error_output;
	document.getElementById("info_box").style.display = "none";
}

// requests to the update server
function server_request(request_dict, path, callback) {
	url = data.update_server + "/" + path
	var xmlhttp = new XMLHttpRequest();
	xmlhttp.open("POST", url, true);
	xmlhttp.setRequestHeader("Content-type", "application/json");
	xmlhttp.send(JSON.stringify(request_dict));
	xmlhttp.onerror = function(e) {
		console.log("update server down")
	}
	xmlhttp.addEventListener('load', function(event) {
		callback(xmlhttp)
	});
}

function image_request() {
	request_dict = {}
	request_dict.distro = document.request_form.distro.value;
	request_dict.version = document.request_form.release.value;
	profile_split = document.request_form.profile.value.split("/");
	request_dict.target = profile_split[0]
	request_dict.subtarget = profile_split[1]
	request_dict.board = profile_split[2]
	request_dict.network_profile = document.request_form.network_profile.value
	if (packages != "") {
		request_dict.packages = packages
	}
	server_request(request_dict, "image-request", image_request_handler)
}

function image_request_handler(response) {
	if (response.status === 400) {
		response_content = JSON.parse(response.responseText)
		error_box_content = response_content.error
		if('log' in response_content) {
			error_box_content += ' <a href="' + response_content.log + '">Build log</a>'
		}
		error_box(error_box_content)

	} else if (response.status === 500) {
		error_box("internal server error. please try again later")
	} else if (response.status === 503) {
		error_box("please wait. server overloaded")
		// handle overload
		setTimeout(image_request, 30000)
	} else if (response.status === 201) {
		response_content = JSON.parse(response.responseText)
		if(response_content.queue != undefined) {
			// in queue
			info_box("please wait. you are in queue position " + response_content.queue)
			console.log("queued")
		} else {
			info_box("imagebuilder not ready, please wait")
			console.log("setting up imagebuilder")
		}
		setTimeout(image_request, 5000)
	} else if (response.status === 206) {
		// building
		console.log("building")
		info_box("building image")
		setTimeout(image_request, 5000)
	} else if (response.status === 200) {
		// ready to download
		response_content = JSON.parse(response.responseText)
		files_url = response_content.files
		load_files();
		info_box("image created. Download: <a href='" + response_content.sysupgrade + "'>Firmware</a>, <a href='" + response_content.sysupgrade + ".log'>Build log</a>, <a href='" + response_content.sysupgrade + ".sig'>Signature</a>")
	}
}

function load_files() {
	var xmlhttp = new XMLHttpRequest();

	xmlhttp.open("GET", files_url, true);

	xmlhttp.onreadystatechange = function () {
		if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
			releases_results(xmlhttp);
		}
	}
	xmlhttp.send(null);

	function releases_results(xmlhttp) {
		response_content = JSON.parse(xmlhttp.responseText);
		var list = document.createElement('ul');

		for(var i = 0; i < response_content.length; i++) {
			var item = document.createElement('li');
			var link = document.createElement('a');
			link.href = files_url + response_content[i].name
			link.innerHTML = response_content[i].name
			item.appendChild(link)
			list.appendChild(item);
		}
		document.getElementById("files_box").appendChild(list);
	}
};
