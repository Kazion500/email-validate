const selectStatus = document.getElementById("selectStatus");

selectStatus.addEventListener("change", sendFilter);

async function sendFilter(e) {
  let statusValue = e.target.value;

  let token = new URLSearchParams(location.search).get("token");
  let url = `/?token=${token}&status=${statusValue}`;
  if (statusValue === "") {
    url = `/?token=${token}`;
  }

  window.location = url;
}
