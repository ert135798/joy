// ==UserScript==
// @name         Redmine Custom Panel 精簡版 v2
// @namespace    http://tampermonkey.net/
// @version      2.12
// @description  精簡面板：填日期/填人員，角色、欄位、基準日、偏移、指派人下拉
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
        wrapper.style.zIndex = "999999";
        wrapper.style.padding = "10px";
        wrapper.style.borderRadius = "8px";

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

        //預設常駐打開=true,反之false
        let isOpen = false;
        if(isOpen) {
            wrapper.style.background = "#CCEEFF";
            wrapper.style.border = "1px solid #ccc";
            toggleBtn.innerText = "▲";
        } else {
            container.style.display = "none";
            wrapper.style.background = "transparent";
            wrapper.style.border = "none";
            toggleBtn.innerText = "▼";
        }

        // 基準日期
        const baseDateInput = document.createElement("input");
        baseDateInput.type = "date";
        baseDateInput.style.marginRight = "5px";
        baseDateInput.value = new Date().toISOString().split('T')[0];

        // 偏移天數
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
            label.appendChild(cb);
            label.appendChild(document.createTextNode(r));
            roleWrapper.appendChild(label);
            roleCheckboxes[r]=cb;
        });

        // 欄位類型下拉
        const fieldSelect = document.createElement("select");
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
            {text:"1", value:"startDate"},
            {text:"2", value:"endDate"},
            {text:"3", value:"forUserDate"},
            {text:"4", value:"plannedStartDate"},
            {text:"5", value:"plannedEndDate"},
            {text:"6", value:"actualStartDate"},
            {text:"7", value:"actualEndDate"}
        ];
        fieldOptions_date.forEach(opt=>fieldSelect.add(new Option(opt.text,opt.value)));
        fieldSelect.style.marginRight="5px";


        // 操作選擇下拉
        const actionSelect = document.createElement("select");
        actionSelect.style.marginRight="5px";
        [
            {text:"填日期", value:"fillDate"},
            {text:"填人員", value:"fillName"}
        ].forEach(a=>actionSelect.add(new Option(a.text,a.value)));
        actionSelect.value="fillDate";

        // 指派人下拉
        const assigneeSelect = document.createElement("select");
        assigneeSelect.style.marginRight="5px";
        assigneeSelect.style.minWidth="120px";
        assigneeSelect.style.display = "none"; // 初始隱藏

        const issueAssignee = document.getElementById("issue_assigned_to_id");
        if(issueAssignee){
            Array.from(issueAssignee.options).forEach(opt=>{
                assigneeSelect.add(new Option(opt.text,opt.value));
            });
        }
        const currentUser = document.querySelector("a.user.active");
        if(currentUser){
            const match=currentUser.href.match(/\/users\/(\d+)/);
            if(match) assigneeSelect.value = match[1];
        }

        // 監聽操作下拉切換顯示
        actionSelect.addEventListener("change", ()=>{
            const isFillName = actionSelect.value === "fillName";
            assigneeSelect.style.display = isFillName ? "inline-block" : "none";
            baseDateInput.style.display = isFillName ? "none" : "inline-block";
            offsetInput.style.display = isFillName ? "none" : "inline-block";

            // 更新欄位下拉選項
            while(fieldSelect.options.length > 0) fieldSelect.remove(0); // 清空
            const opts = isFillName ? fieldOptions_person : fieldOptions_date;
            opts.forEach(opt => fieldSelect.add(new Option(opt.text, opt.value)));
        });


        // 執行按鈕
        const btnExecute = document.createElement("button");
        btnExecute.innerText="執行";
        btnExecute.style.marginRight="5px";

        // 清空按鈕
        const btnClear=document.createElement("button");
        btnClear.innerText="清空欄位";

        // 加入 container
        container.appendChild(actionSelect);

        container.appendChild(assigneeSelect);
        container.appendChild(roleWrapper);
        container.appendChild(fieldSelect);
        container.appendChild(baseDateInput);
        container.appendChild(offsetInput);
        container.appendChild(btnExecute);
        container.appendChild(btnClear);//清空欄位


        document.body.appendChild(wrapper);

        // 日期填寫函數
        const roleFields = {
            "SA":[10,17,18,25],
            "SD":[39,40,41,42],
            "PG":[19,20,21,26],
            "TESTER":[45,46,47,48],
            "ALL":[]
        };
        const startDateFields=[10,18,19,21,45,47,39,41,33];
        const endDateFields=[17,25,20,26,46,48,40,42,34];
        const plannedStartFields=[10,39,19,45];
        const plannedEndFields=[17,40,20,41];
        const actualStartFields=[18,41,21,47];
        const actualEndFields=[25,42,26,48];
        const forUserDate=[33,34,"issue_due_date"];

        function getDateFromBase(base,offset=0){
            const d=new Date(base);
            d.setDate(d.getDate()+offset);
            const y=String(d.getFullYear()).padStart(4,"0");
            const m=String(d.getMonth()+1).padStart(2,"0");
            const day=String(d.getDate()).padStart(2,"0");
            return `${y}-${m}-${day}`;
        }

        function fillDate(offsetDays,fieldType,baseDate){
            const d=getDateFromBase(baseDate,offsetDays);
            const selectedRoles=roles.filter(r=>roleCheckboxes[r].checked);
            if(selectedRoles.length===0){ alert("⚠️ 請勾選至少一個角色"); return; }

            selectedRoles.forEach(role=>{
                let ids=[];
                if(role==="ALL"){
                    ids = fieldType==="startDate"?startDateFields
                        :fieldType==="endDate"?endDateFields
                        :fieldType==="plannedStartDate"?plannedStartFields
                        :fieldType==="plannedEndDate"?plannedEndFields
                        :fieldType==="actualStartDate"?actualStartFields
                        :fieldType==="actualEndDate"?actualEndFields
                        :fieldType==="forUserDate"?forUserDate
                        :[...startDateFields,...endDateFields,...plannedStartFields,...plannedEndFields,...actualStartFields,...actualEndFields,...forUserDate];
                } else {
                    const roleIds=roleFields[role]||[];
                    ids = fieldType==="all"?roleIds
                        :fieldType==="startDate"?roleIds.filter(id=>startDateFields.includes(id))
                        :fieldType==="endDate"?roleIds.filter(id=>endDateFields.includes(id))
                        :fieldType==="plannedStartDate"?roleIds.filter(id=>plannedStartFields.includes(id))
                        :fieldType==="plannedEndDate"?roleIds.filter(id=>plannedEndFields.includes(id))
                        :fieldType==="actualStartDate"?roleIds.filter(id=>actualStartFields.includes(id))
                        :fieldType==="actualEndDate"?roleIds.filter(id=>actualEndFields.includes(id))
                        :fieldType==="forUserDate"?roleIds.filter(id=>forUserDate.includes(id))
                        :[];
                }
                ids.forEach(id=>{
                    let el = typeof id==="number"?document.getElementById(`issue_custom_field_values_${id}`):document.getElementById(id);
                    if(el) el.value=d;
                });
            });
            alert(`✅ 已填入 ${selectedRoles.join(", ")} 的 ${fieldType} 欄位`);
        }

        function fillName(){
            const nameInput=document.getElementById("issue_subject");
            if(!nameInput){ alert("⚠️ 找不到名稱欄位"); return; }
            const nameValue=prompt("請輸入名稱","");
            if(nameValue!==null){ nameInput.value=nameValue; alert(`✅ 名稱已設定為：${nameValue}`);}
        }

        function clearFields(){
            const selectedRoles=roles.filter(r=>roleCheckboxes[r].checked);
            const fieldType=fieldSelect.value;
            if(selectedRoles.length===0){ alert("⚠️ 請勾選至少一個角色"); return; }

            selectedRoles.forEach(role=>{
                let ids=[];
                if(role==="ALL"){
                    ids = fieldType==="startDate"?startDateFields
                        :fieldType==="endDate"?endDateFields
                        :fieldType==="plannedStartDate"?plannedStartFields
                        :fieldType==="plannedEndDate"?plannedEndFields
                        :fieldType==="actualStartDate"?actualStartFields
                        :fieldType==="actualEndDate"?actualEndFields
                        :fieldType==="forUserDate"?forUserDate
                        :[...startDateFields,...endDateFields,...plannedStartFields,...plannedEndFields,...actualStartFields,...actualEndFields,...forUserDate];
                } else {
                    const roleIds=roleFields[role]||[];
                    ids = fieldType==="all"?roleIds
                        :fieldType==="startDate"?roleIds.filter(id=>startDateFields.includes(id))
                        :fieldType==="endDate"?roleIds.filter(id=>endDateFields.includes(id))
                        :fieldType==="plannedStartDate"?roleIds.filter(id=>plannedStartFields.includes(id))
                        :fieldType==="plannedEndDate"?roleIds.filter(id=>plannedEndFields.includes(id))
                        :fieldType==="actualStartDate"?roleIds.filter(id=>actualStartFields.includes(id))
                        :fieldType==="actualEndDate"?roleIds.filter(id=>actualEndFields.includes(id))
                        :fieldType==="forUserDate"?roleIds.filter(id=>forUserDate.includes(id))
                        :[];
                }
                ids.forEach(id=>{
                    let el = typeof id==="number"?document.getElementById(`issue_custom_field_values_${id}`):document.getElementById(id);
                    if(el) el.value="";
                });
            });

            const linkCopy=document.getElementById("link_copy");
            if(linkCopy && linkCopy.type==="checkbox") linkCopy.checked=false;
            alert(`✅ 已清空 ${selectedRoles.join(", ")} 的 ${fieldType} 欄位，並取消 link_copy 勾選`);
        }

        btnExecute.addEventListener("click", ()=>{
            if(actionSelect.value==="fillDate"){
                const offset=parseInt(offsetInput.value);
                if(isNaN(offset)){ alert("⚠️ 請輸入有效天數數字"); return; }
                const baseDate=baseDateInput.value;
                if(!baseDate){ alert("⚠️ 請選擇基準日期"); return; }
                fillDate(offset,fieldSelect.value,baseDate);
            } else if(actionSelect.value==="fillName"){
                const selectedUserId = assigneeSelect.value;
                const assigneeInput = document.getElementById("issue_assigned_to_id");
                if(assigneeInput) assigneeInput.value = selectedUserId;
                fillName();
            }
        });

        btnClear.addEventListener("click", ()=>clearFields());

        toggleBtn.addEventListener("click", ()=>{
            isOpen=!isOpen;
            container.style.display=isOpen?"block":"none";
            wrapper.style.background=isOpen?"#CCEEFF":"transparent";
            wrapper.style.border=isOpen?"1px solid #ccc":"none";
            toggleBtn.innerText=isOpen?"▲":"▼";
        });
    }

    window.addEventListener('load', addInput);
})();
