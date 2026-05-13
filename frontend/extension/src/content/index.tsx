const button = document.createElement("button");
button.innerText = "🛒 SepetIQ";
button.style.cssText = `
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 999999;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 24px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
`;

button.addEventListener("click", () => {
  alert("SepetIQ çalışıyor!");
});

document.body.appendChild(button);
