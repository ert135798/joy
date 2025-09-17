// ==UserScript==
// @name         Redmine Custom Panel 精簡版 v2.19.2
// @namespace    http://tampermonkey.net/
// @version      2.19.4
// @description  2.19.4 還原預設不要還原收合狀態 & 移除提示文字(太煩了) 2.19.2 工時自動補到小數位2位
// @match        http://*/redmine/*
// @grant        none
// @updateURL    https://ert135798.github.io/joy/redmine_gadget.js
// @downloadURL  https://ert135798.github.io/joy/redmine_gadget.js
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const PANEL_KEY = 'redmineCustomPanelState';

    function savePanelState(state) { localStorage.setItem(PANEL_KEY, JSON.stringify(state)); }
    function loadPanelState() { try { return JSON.parse(localStorage.getItem(PANEL_KEY)) || {}; } catch(e){ return {}; } }

    function addInput() {

        if (document.getElementById("redmineCustomDateWrapper")) return;

        const state = loadPanelState();

        const wrapper = document.createElement("div");
        wrapper.id = "redmineCustomDateWrapper";
        wrapper.style.position = "fixed";
        wrapper.style.bottom = "20px";
        wrapper.style.right = "20px";
        wrapper.style.zIndex = "999999";
        wrapper.style.padding = "10px";
        wrapper.style.borderRadius = "8px";
        wrapper.style.visibility = "hidden";

        let isOpen = state.isOpen ?? false;

        const toggleBtn = document.createElement("button");
        toggleBtn.style.position = "absolute";
        toggleBtn.style.top = "-20px";
        toggleBtn.style.right = "-5px";
        toggleBtn.style.padding = "2px 5px";
        wrapper.appendChild(toggleBtn);

        const container = document.createElement("div");
        container.style.display = isOpen ? "block" : "none";
        wrapper.style.background = isOpen ? "#CCEEFF" : "transparent";
        wrapper.style.border = isOpen ? "1px solid #ccc" : "none";
        toggleBtn.innerText = isOpen ? "▲" : "▼";
        wrapper.appendChild(container);

        // 基準日期 & 偏移天數（不存）
        const baseDateInput = document.createElement("input");
        baseDateInput.type = "date";
        baseDateInput.style.marginRight = "5px";
        baseDateInput.value = new Date().toISOString().split('T')[0];

        const offsetInput = document.createElement("input");
        offsetInput.type = "number";
        offsetInput.placeholder = "偏移天數 0=基準日";
        offsetInput.style.width = "120px";
        offsetInput.style.marginRight = "5px";
        offsetInput.value = "0";

        // 角色勾選框
        const roles = ["SA","PG","SD","TESTER","ALL"];
        const roleWrapper = document.createElement("span");
        roleWrapper.style.marginRight = "5px";
        const roleCheckboxes = {};
        roles.forEach(r=>{
            const label = document.createElement("label");
            label.style.marginRight="5px";
            const cb=document.createElement("input");
            cb.type="checkbox";
            cb.value=r;
            cb.checked = state.roles?.[r] ?? false;
            label.appendChild(cb);
            label.appendChild(document.createTextNode(r));
            roleWrapper.appendChild(label);
            roleCheckboxes[r]=cb;

            cb.addEventListener("change", ()=>{
                const s = loadPanelState();
                s.roles = Object.fromEntries(Object.entries(roleCheckboxes).map(([k,v])=>[k,v.checked]));
                savePanelState(s);
            });
        });

        // 欄位下拉
        const fieldSelect = document.createElement("select");
        fieldSelect.style.marginRight="5px";
        const fieldOptions_date = [
            {text:"全部", value:"all"},
            {text:"開始日", value:"startDate"},
            {text:"結束日", value:"endDate"},
            {text:"預計(追蹤用)", value:"forUserDate"},
            {text:"預計開始日", value:"plannedStartDate"},
            {text:"預計結束日", value:"plannedEndDate"},
            {text:"實際開始日", value:"actualStartDate"},
            {text:"實際結束日", value:"actualEndDate"}
        ];
        const fieldOptions_person = [
            {text:"全部", value:"all"},
            {text:"追蹤欄位", value:"tracking"},
            {text:"簽名", value:"signature"}
        ];

        function populateFieldSelect(isName){
            while(fieldSelect.options.length>0) fieldSelect.remove(0);
            const opts = isName ? fieldOptions_person : fieldOptions_date;
            opts.forEach(opt=>fieldSelect.add(new Option(opt.text,opt.value)));
            fieldSelect.value = state.fieldSelect ?? opts[0].value;
        }

        // 操作下拉
        const actionSelect = document.createElement("select");
        actionSelect.style.marginRight="5px";
        [
            {text:"填日期", value:"fillDate"},
            {text:"填人員", value:"fillName"}
        ].forEach(a=>actionSelect.add(new Option(a.text,a.value)));
        actionSelect.value = state.actionSelect ?? "fillDate";

        // 指派人下拉
        const assigneeSelect = document.createElement("select");
        assigneeSelect.style.marginRight="5px";
        assigneeSelect.style.minWidth="120px";

        const issueAssignee = document.getElementById("issue_assigned_to_id");
        if(issueAssignee) Array.from(issueAssignee.options).forEach(opt=>assigneeSelect.add(new Option(opt.text,opt.value)));

        const currentUser = document.querySelector("a.user.active");
        if(currentUser){
            const match=currentUser.href.match(/\/users\/(\d+)/);
            if(match) assigneeSelect.value = match[1];
        }

        // 根據 actionSelect 控制欄位顯示
        function updateFieldsDisplay() {
            const isFillName = actionSelect.value === "fillName";
            assigneeSelect.style.display = isFillName ? "inline-block" : "none";
            baseDateInput.style.display = isFillName ? "none" : "inline-block";
            offsetInput.style.display = isFillName ? "none" : "inline-block";
            populateFieldSelect(isFillName);
        }

        updateFieldsDisplay();

        actionSelect.addEventListener("change", ()=>{
            updateFieldsDisplay();
            const s = loadPanelState();
            s.actionSelect = actionSelect.value;
            savePanelState(s);
        });

        fieldSelect.addEventListener("change", ()=>{
            const s = loadPanelState();
            s.fieldSelect = fieldSelect.value;
            savePanelState(s);
        });

        // ====== 欄位映射 ======
        // 簽名／人員欄位（字串 id）
        const roleFieldMap = {
            "ALL": ["issue_assigned_to_id","issue_custom_field_values_38","issue_custom_field_values_27","issue_custom_field_values_43","issue_custom_field_values_28","issue_custom_field_values_44"],
            "SA": ["issue_custom_field_values_27"],
            "SD": ["issue_custom_field_values_43"],
            "PG": ["issue_custom_field_values_28"],
            "TESTER": ["issue_custom_field_values_44"]
        };

        // 日期欄位（數字 id）
        // 以角色索引映射：SA=0, SD=1, PG=2, TESTER=3
        const roleIdx = { SA:0, SD:1, PG:2, TESTER:3 };
        //預計開始日
        const plannedStartFields=[10,39,19,45];
        //預計結束日
        const plannedEndFields=[17,40,20,46];
        //實際開始日
        const actualStartFields =[18,41,21,47];
        //實際結束日
        const actualEndFields=[25,42,26,48];

        // 綜合集合（給 ALL 用）
        const startDateFields=[10,18,39,41,19,21,45,47,33];
        const endDateFields=[17,25,40,42,20,26,46,48,34];

        const forUserDate=[33,34,"issue_due_date"]; // 不分角色

        function fieldsByRoleAndType(role, fieldType){
            if (role === "ALL") {
                return fieldType==="startDate"? startDateFields
                     : fieldType==="endDate" ? endDateFields
                     : fieldType==="plannedStartDate"? plannedStartFields
                     : fieldType==="plannedEndDate"? plannedEndFields
                     : fieldType==="actualStartDate" ? actualStartFields
                     : fieldType==="actualEndDate"? actualEndFields
                     : fieldType==="forUserDate"? forUserDate
                     : /* all */ [...plannedStartFields, ...actualStartFields, ...plannedEndFields, ...actualEndFields, ...forUserDate];
            }

            const i = roleIdx[role];
            if (i == null) return [];

            return fieldType==="startDate" ? [plannedStartFields[i], actualStartFields[i]]
                 : fieldType==="endDate" ? [plannedEndFields[i], actualEndFields[i]]
                 : fieldType==="plannedStartDate"? [plannedStartFields[i]]
                 : fieldType==="plannedEndDate"? [plannedEndFields[i]]
                 : fieldType==="actualStartDate" ? [actualStartFields[i]]
                 : fieldType==="actualEndDate"? [actualEndFields[i]]
                 : fieldType==="forUserDate" ? forUserDate // 追蹤日期不分角色
                 : /* all(角色) */ [plannedStartFields[i], actualStartFields[i], plannedEndFields[i], actualEndFields[i], ...forUserDate];
        }

        function getDateFromBase(base,offset=0){
            const d=new Date(base); d.setDate(d.getDate()+offset);
            const y=String(d.getFullYear()).padStart(4,"0");
            const m=String(d.getMonth()+1).padStart(2,"0");
            const day=String(d.getDate()).padStart(2,"0");
            return `${y}-${m}-${day}`;
        }

        function setValue(el,value){
            if(!el) return;
            if(el.tagName === "SELECT"){
                const opt = Array.from(el.options).find(o => o.value === value || o.text === value);
                if(opt) el.value = opt.value;
            } else el.value = value;
        }

        function fillDate(offsetDays,fieldType,baseDate){
            const d=getDateFromBase(baseDate,offsetDays);
            const selectedRoles=roles.filter(r=>roleCheckboxes[r].checked);
            if(selectedRoles.length===0){ alert("⚠️ 請勾選至少一個角色"); return; }

            selectedRoles.forEach(role=>{
                const ids = fieldsByRoleAndType(role, fieldType);
                ids.forEach(id=>{
                    const el = typeof id==="number"?document.getElementById(`issue_custom_field_values_${id}`):document.getElementById(id);
                    setValue(el,d);
                });
            });

            alert(`✅ 已填入 ${selectedRoles.join(", ")} 的 ${fieldType} 欄位`);
        }

        function fillName() {
            const selectedUserId = assigneeSelect.value;
            if (!selectedUserId) { alert("⚠️ 請選擇指派人"); return; }
            const selectedRoles=roles.filter(r=>roleCheckboxes[r].checked);
            if(selectedRoles.length===0){ alert("⚠️ 請勾選至少一個角色"); return; }

            const fieldType = fieldSelect.value;
            const targetFields = [];
            if (fieldType === "tracking") targetFields.push("issue_assigned_to_id","issue_custom_field_values_38");
            else if (fieldType === "signature") targetFields.push("issue_custom_field_values_27","issue_custom_field_values_43","issue_custom_field_values_28","issue_custom_field_values_44");
            else if (fieldType === "all") targetFields.push(...roleFieldMap.ALL);

            const assigneeTextMap = {};
            Array.from(assigneeSelect.options).forEach(opt => {
                assigneeTextMap[opt.value] = opt.text;
            });


            targetFields.forEach(id=>{
                const el=document.getElementById(id); if(!el) return;
                let valueToSet = selectedUserId;
                if(["issue_custom_field_values_27","issue_custom_field_values_43","issue_custom_field_values_28","issue_custom_field_values_44"].includes(id)){
                    const assigneeName=assigneeTextMap[selectedUserId];
                    const matchOpt = Array.from(el.options).find(o=>o.text.trim()===assigneeName);
                    valueToSet = matchOpt?matchOpt.value:"";
                }
                setValue(el,valueToSet);
            });

            alert(`✅ 已將「${assigneeTextMap[selectedUserId]}」填入 ${fieldSelect.options[fieldSelect.selectedIndex].text} 欄位`);
        }

        function clearFields(){
            const selectedRoles=roles.filter(r=>roleCheckboxes[r].checked);
            const fieldType=fieldSelect.value;

            if(actionSelect.value==="fillName"){
                let targetFields=[]
                if(fieldType==="tracking") targetFields=["issue_assigned_to_id","issue_custom_field_values_38"];
                else if(fieldType==="signature") targetFields=["issue_custom_field_values_27","issue_custom_field_values_43","issue_custom_field_values_28","issue_custom_field_values_44"];
                else if(fieldType==="all") targetFields=[...roleFieldMap.ALL];

                targetFields.forEach(id=>{
                    const el=document.getElementById(id);
                    if(el){ if(el.tagName==="SELECT") el.selectedIndex=0; else el.value=""; }
                });

                const linkCopy=document.getElementById("link_copy");
                if(linkCopy && linkCopy.type==="checkbox") linkCopy.checked=false;

                alert(`✅ 已清空 ${fieldType} 欄位並取消 link_copy 勾選`);
                return;
            }

            if(selectedRoles.length===0){ alert("⚠️ 請勾選至少一個角色"); return; }
            selectedRoles.forEach(role=>{
                const ids = fieldsByRoleAndType(role, fieldType);
                ids.forEach(id=>{
                    const el=typeof id==="number"?document.getElementById(`issue_custom_field_values_${id}`):document.getElementById(id);
                    if(el){ if(el.tagName==="SELECT") el.selectedIndex=0; else el.value=""; }
                });
            });

            const linkCopy=document.getElementById("link_copy");
            if(linkCopy && linkCopy.type==="checkbox") linkCopy.checked=false;

            alert(`✅ 已清空 ${selectedRoles.join(", ")} 的 ${fieldType} 欄位，並取消 link_copy 勾選`);
        }

        // ====== 按鈕 ======
        const btnExecute=document.createElement("button");
        btnExecute.innerText="執行";
        btnExecute.style.marginRight="5px";
        btnExecute.addEventListener("click", ()=>{
            if(actionSelect.value==="fillDate"){
                const offset=parseInt(offsetInput.value);
                if(isNaN(offset)){ alert("⚠️ 請輸入有效天數數字"); return; }
                const baseDate=baseDateInput.value;
                if(!baseDate){ alert("⚠️ 請選擇基準日期"); return; }
                fillDate(offset,fieldSelect.value,baseDate);
            } else if(actionSelect.value==="fillName"){
                fillName();
            }
        });

        const btnClear=document.createElement("button");
        btnClear.innerText="清空欄位";
        btnClear.addEventListener("click", clearFields);

        const btnReset=document.createElement("button");
        btnReset.innerText="還原預設";
        btnReset.style.marginLeft="5px";
        btnReset.addEventListener("click", ()=>{
            const s = {
                isOpen: true,
                roles: {},
                actionSelect: "fillDate",
                fieldSelect: "all" // reset 成 all
            };
            savePanelState(s);

            // UI 同步
            for (const cb of Object.values(roleCheckboxes)) cb.checked = false;
            actionSelect.value = "fillDate";
            fieldSelect.value = "all";
            assigneeSelect.selectedIndex = 0;

            alert("✅ 已還原預設");

        });

        container.appendChild(actionSelect);
        container.appendChild(assigneeSelect);
        container.appendChild(roleWrapper);
        container.appendChild(fieldSelect);
        container.appendChild(baseDateInput);
        container.appendChild(offsetInput);
        container.appendChild(btnExecute);
        container.appendChild(btnClear);
        container.appendChild(btnReset);

        document.body.appendChild(wrapper);
        wrapper.style.visibility = "visible";

        toggleBtn.addEventListener("click", ()=>{
            isOpen = !isOpen;
            container.style.display = isOpen ? "block" : "none";
            wrapper.style.background = isOpen ? "#CCEEFF" : "transparent";
            wrapper.style.border = isOpen ? "1px solid #ccc" : "none";
            toggleBtn.innerText = isOpen ? "▲" : "▼";
            const s = loadPanelState();
            s.isOpen = isOpen;
            savePanelState(s);
        });

        // ====== 永遠有效的工時自動加總 & 格式化 ======
        const sumIds = [55, 57, 58, 59]; // SA、SD、PG、TESTER

        function autoSumEstimatedHours() {
            const total = sumIds.reduce((sum, id) => {
                const el = document.getElementById(`issue_custom_field_values_${id}`);
                return sum + (el && !isNaN(parseFloat(el.value)) ? parseFloat(el.value) : 0);
            }, 0);
            const totalField = document.getElementById("issue_estimated_hours");
            if (totalField) totalField.value = total.toFixed(2);
        }

        function formatHoursField(el) {
            if (!el) return;
            el.value = el.value.trim();
            let val = parseFloat(el.value);
            if (isNaN(val)) val = 0;
            el.value = val.toFixed(2);
        }

        // 事件代理：監聽 body，捕捉 input/blur/keydown
        document.body.addEventListener("input", e => {
            if (sumIds.some(id => e.target.id === `issue_custom_field_values_${id}`)) {
                autoSumEstimatedHours();
            }
        });

        document.body.addEventListener("blur", e => {
            if (sumIds.some(id => e.target.id === `issue_custom_field_values_${id}`)) {
                formatHoursField(e.target);
                autoSumEstimatedHours();
            }
        }, true); // useCapture=true，捕捉到冒泡前

        document.body.addEventListener("keydown", e => {
            if (e.key === "Enter" && sumIds.some(id => e.target.id === `issue_custom_field_values_${id}`)) {
                e.preventDefault();
                sumIds.forEach(id => formatHoursField(document.getElementById(`issue_custom_field_values_${id}`)));
                autoSumEstimatedHours();
                e.target.form?.submit();
            }
        });

        // 初始化：頁面 load 時補一次格式
        window.addEventListener("load", () => {
            sumIds.forEach(id => formatHoursField(document.getElementById(`issue_custom_field_values_${id}`)));
            autoSumEstimatedHours();
        });


    }

    // AJAX 切換 issue 自動掛載
    const observer=new MutationObserver(()=>addInput());
    observer.observe(document.body,{childList:true,subtree:true});

    window.addEventListener('load', addInput);

})();
