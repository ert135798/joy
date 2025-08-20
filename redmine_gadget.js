// ==UserScript==
// @name         Redmine Custom Date Input (含SD + 實際日期 + 收合預設隱藏)
// @namespace    http://tampermonkey.net/
// @version      2.7.1 調整欄位
// @description  GITHUB版本  2.7 增加共用角色和預計(追蹤用)欄位
// @description  (過去) 2.6.3 改背景設碼#CCEEFF Redmine 左下角輸入框，可依勾選角色與欄位類型填入欄位，支援基準日期 + 偏移，清空依角色+類別欄位，預設收合且隱藏背景與邊框
// @match        http://*/redmine/*
// @grant        none
// @updateURL    https://ert135798.github.io/joy/redmine_gadget.js
// @downloadURL  https://ert135798.github.io/joy/redmine_gadget.js
// ==/UserScript==

(function() {
    'use strict';

    function addInput() {
        if (document.getElementById("redmineCustomDateWrapper")) return;

        const wrapper = document.createElement("div");
        wrapper.id = "redmineCustomDateWrapper";
        wrapper.style.position = "fixed";
        wrapper.style.bottom = "20px";
        wrapper.style.right = "20px";
        wrapper.style.padding = "10px";
        wrapper.style.borderRadius = "8px";
        wrapper.style.zIndex = "999999";

        // 收合按鈕
        const toggleBtn = document.createElement("button");
        toggleBtn.style.position = "absolute";
        toggleBtn.style.top = "-20px";
        toggleBtn.style.right = "-5px";
        toggleBtn.style.padding = "2px 5px";
        wrapper.appendChild(toggleBtn);

        // 內容區塊
        const container = document.createElement("div");
        wrapper.appendChild(container);

        // 基準日期
        const baseDateInput = document.createElement("input");
        baseDateInput.type = "date";
        baseDateInput.id = "baseDate";
        baseDateInput.style.marginRight = "5px";
        baseDateInput.value = new Date().toISOString().split('T')[0];

        // 偏移天數
        const offsetInput = document.createElement("input");
        offsetInput.type = "number";
        offsetInput.id = "dayOffset";
        offsetInput.placeholder = "偏移天數 0=基準日";
        offsetInput.style.width = "120px";
        offsetInput.style.marginRight = "5px";
        offsetInput.value = "0";

        // 角色勾選框
        const roleWrapper = document.createElement("span");
        roleWrapper.style.marginRight = "5px";
        const roles = ["SA","PG","SD","TESTER","ALL"];
        const roleCheckboxes = {};
        roles.forEach(r => {
            const label = document.createElement("label");
            label.style.marginRight = "5px";
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.value = r;
            label.appendChild(cb);
            label.appendChild(document.createTextNode(r));
            roleWrapper.appendChild(label);
            roleCheckboxes[r] = cb;
        });

        // 欄位類型下拉
        const fieldSelect = document.createElement("select");
        const fieldOptions = [
            {text: "全部", value: "all"},
            {text: "開始日", value: "startDate"},
            {text: "結束日", value: "endDate"},
            {text: "預計(追蹤用)", value: "forUserDate"},
            {text: "預計開始日", value: "plannedStartDate"},
            {text: "預計結束日", value: "plannedEndDate"},
            {text: "實際開始日", value: "actualStartDate"},
            {text: "實際結束日", value: "actualEndDate"}
        ];
        fieldOptions.forEach(opt => {
            const option = document.createElement("option");
            option.text = opt.text;
            option.value = opt.value;
            fieldSelect.add(option);
        });
        fieldSelect.style.marginRight = "5px";

        // 按鈕
        const btnFill = document.createElement("button");
        btnFill.innerText = "填日期";
        btnFill.style.marginRight = "5px";
        const btnClear = document.createElement("button");
        btnClear.innerText = "清空欄位";

        // 將控件加入 container
        container.appendChild(baseDateInput);
        container.appendChild(offsetInput);
        container.appendChild(roleWrapper);
        container.appendChild(fieldSelect);
        container.appendChild(btnFill);
        container.appendChild(btnClear);

        document.body.appendChild(wrapper);

        // 角色欄位定義
        const roleFields = {
            "SA": [10,17,18,25],
            "SD": [39,40,41,42],
            "PG": [19,20,21,26],
            "TESTER": [45,46,47,48],
            "ALL": []
        };

        // 欄位分類
        const startDateFields = [10,18,19,21,45,47,39,41,33];
        const endDateFields = [17,25,20,26,46,48,40,42,34];
        const plannedStartFields = [10,39,19,45];//預計開始
        const plannedEndFields = [17,40,20,41];//預計結束
        const actualStartFields = [18,41,21,47];
        const actualEndFields = [25,42,26,48];
        const forUserDate = [33,34,"issue_due_date"];//預計(追蹤)用欄位

        // 計算日期
        function getDateFromBase(base, offsetDays = 0) {
            const date = new Date(base);
            date.setDate(date.getDate() + offsetDays);
            const y = String(date.getFullYear()).padStart(4, "0");
            const m = String(date.getMonth() + 1).padStart(2, "0");
            const d = String(date.getDate()).padStart(2, "0");
            return `${y}-${m}-${d}`;
        }

        // 填入日期
        function fillDate(offsetDays, fieldType, baseDate) {
            const ddd = getDateFromBase(baseDate, offsetDays);
            const selectedRoles = roles.filter(r => roleCheckboxes[r].checked);
            if(selectedRoles.length === 0) { alert("⚠️ 請勾選至少一個角色"); return; }

            selectedRoles.forEach(role => {
                let ids = [];
                if(role === "ALL") {
                    if(fieldType === "startDate") ids = startDateFields;
                    else if(fieldType === "endDate") ids = endDateFields;
                    else if(fieldType === "plannedStartDate") ids = plannedStartFields;
                    else if(fieldType === "plannedEndDate") ids = plannedEndFields;
                    else if(fieldType === "actualStartDate") ids = actualStartFields;
                    else if(fieldType === "actualEndDate") ids = actualEndFields;
                    else if(fieldType === "forUserDate") ids = forUserDate;
                    else ids = [...startDateFields, ...endDateFields, ...plannedStartFields, ...plannedEndFields, ...actualStartFields, ...actualEndFields,...forUserDate];
                } else {
                    const roleIds = roleFields[role] || [];
                    if(fieldType === "all") ids = roleIds;
                    else if(fieldType === "startDate") ids = roleIds.filter(id => startDateFields.includes(id));
                    else if(fieldType === "endDate") ids = roleIds.filter(id => endDateFields.includes(id));
                    else if(fieldType === "plannedStartDate") ids = roleIds.filter(id => plannedStartFields.includes(id));
                    else if(fieldType === "plannedEndDate") ids = roleIds.filter(id => plannedEndFields.includes(id));
                    else if(fieldType === "actualStartDate") ids = roleIds.filter(id => actualStartFields.includes(id));
                    else if(fieldType === "actualEndDate") ids = roleIds.filter(id => actualEndFields.includes(id));
                    else if(fieldType === "forUserDate") ids = roleIds.filter(id => forUserDate.includes(id));
                }
                ids.forEach(id => {
                    let el;
                    if (typeof id === "number") {
                        el = document.getElementById(`issue_custom_field_values_${id}`);
                    } else if (typeof id === "string") {
                       el = document.getElementById(id);// 直接用字串當 DOM id
                    }
                    if (el) el.value = ddd;// 或清空時 el.value = ""
                });
            });
            alert(`✅ 已填入 ${selectedRoles.join(", ")} 的 ${fieldType} 欄位`);
        }

        // 清空欄位
        function clearFields() {
            const selectedRoles = roles.filter(r => roleCheckboxes[r].checked);
            const fieldType = fieldSelect.value;
            if(selectedRoles.length === 0) { alert("⚠️ 請勾選至少一個角色"); return; }

            selectedRoles.forEach(role => {
                let ids = [];
                if(role === "ALL") {
                    if(fieldType === "startDate") ids = startDateFields;
                    else if(fieldType === "endDate") ids = endDateFields;
                    else if(fieldType === "plannedStartDate") ids = plannedStartFields;
                    else if(fieldType === "plannedEndDate") ids = plannedEndFields;
                    else if(fieldType === "actualStartDate") ids = actualStartFields;
                    else if(fieldType === "actualEndDate") ids = actualEndFields;
                    else if(fieldType === "forUserDate") ids = forUserDate;
                    else ids = [...startDateFields, ...endDateFields, ...plannedStartFields, ...plannedEndFields, ...actualStartFields, ...actualEndFields,...forUserDate];
                } else {
                    const roleIds = roleFields[role] || [];
                    if(fieldType === "all") ids = roleIds;
                    else if(fieldType === "startDate") ids = roleIds.filter(id => startDateFields.includes(id));
                    else if(fieldType === "endDate") ids = roleIds.filter(id => endDateFields.includes(id));
                    else if(fieldType === "plannedStartDate") ids = roleIds.filter(id => plannedStartFields.includes(id));
                    else if(fieldType === "plannedEndDate") ids = roleIds.filter(id => plannedEndFields.includes(id));
                    else if(fieldType === "actualStartDate") ids = roleIds.filter(id => actualStartFields.includes(id));
                    else if(fieldType === "actualEndDate") ids = roleIds.filter(id => actualEndFields.includes(id));
                    else if(fieldType === "forUserDate") ids = roleIds.filter(id => forUserDate.includes(id));
                }


                ids.forEach(id => {
                    let el;
                    if (typeof id === "number") {
                        el = document.getElementById(`issue_custom_field_values_${id}`);
                    } else if (typeof id === "string") {
                        el = document.getElementById(id);// 直接用字串當 DOM id
                    }
                    if(el) el.value = "";
                });
            });

            // 🔹 同時處理 link_copy
            const linkCopy = document.getElementById("link_copy");
            if (linkCopy && linkCopy.type === "checkbox") {
                linkCopy.checked = false;// 清除時取消勾選
            }

            alert(`✅ 已清空 ${selectedRoles.join(", ")} 的 ${fieldType} 欄位，並取消 link_copy 勾選`);
        }

        // 按鈕事件
        btnFill.addEventListener("click", () => {
            const offset = parseInt(offsetInput.value);
            if (isNaN(offset)) { alert("⚠️ 請輸入有效天數數字"); return; }
            const fieldType = fieldSelect.value;
            const baseDate = baseDateInput.value;
            if (!baseDate) { alert("⚠️ 請選擇基準日期"); return; }
            fillDate(offset, fieldType, baseDate);
        });

        btnClear.addEventListener("click", () => { clearFields(); });

        // 預設收合
        let isCollapsed = true;
        container.style.display = "none";
        wrapper.style.background = "transparent";
        wrapper.style.border = "none";
        toggleBtn.innerText = "▼";

        // 收合/展開
        toggleBtn.addEventListener("click", () => {
            isCollapsed = !isCollapsed;
            container.style.display = isCollapsed ? "none" : "block";
            //wrapper.style.background = isCollapsed ? "transparent" : "#CCEEFF";
            wrapper.style.background = isCollapsed ? "transparent" : "#CCEEFF";
            wrapper.style.border = isCollapsed ? "none" : "1px solid #ccc";
            toggleBtn.innerText = isCollapsed ? "▼" : "▲";
        });

    window.addEventListener('load', addInput);
})();
