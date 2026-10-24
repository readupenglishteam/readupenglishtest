
  const stepsData = [
    {
      title: "READ",
      desc: "Đọc bài báo thực tế mỗi ngày được tinh chỉnh theo đúng chuẩn cấu trúc đề thi IELTS & TOEIC."
    },
    {
      title: "LEARN",
      desc: "Tra từ trong ngữ cảnh bài đọc, lưu bộ Collocation chuẩn xác kèm giải thích đáp án chi tiết."
    },
    {
      title: "GROW",
      desc: "Theo dõi sự tăng trưởng tốc độ đọc hiểu và Band điểm qua hệ thống báo cáo trực quan."
    }
  ];

  // Tọa độ 3 vị trí trên đường tròn bán kính R = 95px
  // Vị trí 0 (Đỉnh giữa), Vị trí 1 (Phải dưới), Vị trí 2 (Trái dưới)
  const slots = [
    { x: 0, y: -95, scale: 1.25, opacity: 1 },
    { x: 82, y: 48, scale: 0.85, opacity: 0.5 },
    { x: -82, y: 48, scale: 0.85, opacity: 0.5 }
  ];

  let currentActive = 0;

  function updateCircleLayout() {
    stepsData.forEach((_, index) => {
      const node = document.getElementById(`step-node-${index}`);
      // Tính toán vị trí tương đối của node dựa trên nút đang active
      const slotIndex = (index - currentActive + 3) % 3;
      const pos = slots[slotIndex];

      // Áp dụng vị trí và hiệu ứng phóng to/thu nhỏ
      node.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(${pos.scale})`;
      node.style.opacity = pos.opacity;

      // Nút ở trên cùng sẽ ưu tiên hiển thị đè lên (z-index)
      if (slotIndex === 0) {
        node.classList.add("z-10");
        node.classList.remove("z-0");
      } else {
        node.classList.add("z-0");
        node.classList.remove("z-10");
      }
    });

    // Cập nhật text nội dung ở hộp bên dưới
    const titleEl = document.getElementById("active-title");
    const descEl = document.getElementById("active-desc");
    
    titleEl.innerText = stepsData[currentActive].title;
    descEl.innerText = stepsData[currentActive].desc;
  }

  function setActiveStep(index) {
    currentActive = index;
    updateCircleLayout();
  }

  // Khởi tạo vị trí ban đầu
  updateCircleLayout();
