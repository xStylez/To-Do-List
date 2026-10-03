let currentFilter = "Home";
let currentSort = "date";
let projects = [];
let currentProjectId = null;
let editingTodoId = null;
const form = document.getElementById("todo-form");
const addButton = document.querySelector(".add-button");
const detailsModal = document.getElementById("details-modal");
const editModal = document.getElementById("edit-modal");
const detailsButton = document.querySelector(".todo-details");

// makes due date Month / Day only
function formatDueDate(dateString) {
  if (!dateString) return "";

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [, month, day] = dateString.split("-").map(Number);

  const lastTwo = day % 100;
  let suffix = "th";
  if (lastTwo < 11 || lastTwo > 13) {
    if (day % 10 === 1) suffix = "st";
    else if (day % 10 === 2) suffix = "nd";
    else if (day % 10 === 3) suffix = "rd";
  }
  return `${months[month - 1]} ${day}${suffix}`;
}

async function loadTodos(){
    const response = await fetch("http://127.0.0.1:5000/todos");
    const data = await response.json();

    // filter todos for todau & week
    const today = new Date().toISOString().slice(0, 10); //YYYY-MM-DD

    let todos = data.todos;

    if (currentFilter === "Today"){
        todos = todos.filter((todo) => todo.due_date === today);
    }

    if (currentFilter === "Week"){
        const end = new Date(today);
        end.setDate(end.getDate() + 6);
        const endOfWeek = end.toISOString().slice(0, 10);

        todos = todos.filter((todo) => {
            return todo.due_date && todo.due_date >= today && todo.due_date <= endOfWeek;
        });
    }

    if (currentFilter === "Project"){
        todos = todos.filter((todo) => todo.project_id === currentProjectId);
    }

    const isProject = currentFilter === "Project";
    document.getElementById("empty-project").classList.toggle("is-hidden", !(isProject && todos.length === 0));
    document.getElementById("delete-project").classList.toggle("is-hidden", !(isProject && todos.length > 0));

    const priorityRank = { high: 0, medium: 1, low: 2 };

    todos.sort((a, b) => {
        if (currentSort === "priority") {
            return priorityRank[a.priority] - priorityRank[b.priority];
        }
        if (currentSort === "newest") {
            return b.id - a.id;
        }
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
    });


    const list = document.getElementById("todo-list")
    list.innerHTML = "";

    for (const todo of todos){

        // list items
        const li = document.createElement("li");
        li.className = "todo-row";
        
        if (todo.done === 1) {
            li.classList.add("is-done");
        }

        const title = document.createElement("span");
        title.className = "todo-title";
        title.textContent = todo.title;

        const date = document.createElement("span");
        date.className = "todo-date";
        date.textContent = todo.due_date ? formatDueDate(todo.due_date) : "N/A";

        li.classList.add(`priority-${todo.priority}`);

        // delete buttons
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "todo-delete";
        deleteButton.setAttribute("aria-label", "Delete");
        deleteButton.innerHTML = `
            <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 3H15M3 6H21M19 6L18.2987 16.5193C18.1935 18.0975 18.1409 18.8867 17.8 19.485C17.4999 20.0118 17.0472 20.4353 16.5017 20.6997C15.882 21 15.0911 21 13.5093 21H10.4907C8.90891 21 8.11803 21 7.49834 20.6997C6.95276 20.4353 6.50009 20.0118 6.19998 19.485C5.85911 18.8867 5.8065 18.0975 5.70129 16.5193L5 6M10 10.5V15.5M14 10.5V15.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        deleteButton.addEventListener("click", async function () {
            const response = await fetch(`http://127.0.0.1:5000/todos/${todo.id}`, {
                method: "DELETE"
            });

            if (!response.ok){
                const err = await response.json();
                alert(err.error || "Failed to delete todo");
                return;
            }

            await loadTodos();
        });

        // checkboxes
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = todo.done === 1;
        checkbox.addEventListener("change", async function () {
            const response = await fetch(`http://127.0.0.1:5000/todos/${todo.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ done: checkbox.checked ? 1 : 0})
            });

            if (!response.ok){
                const err = await response.json();
                alert(err.error || "Failed to mark todo as done");
                return;
            }

            await loadTodos();
        });

        // edit buttons
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "todo-edit";
        editButton.setAttribute("aria-label", "Edit");
        editButton.innerHTML = `
            <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 3.99998H6.8C5.11984 3.99998 4.27976 3.99998 3.63803 4.32696C3.07354 4.61458 2.6146 5.07353 2.32698 5.63801C2 6.27975 2 7.11983 2 8.79998V17.2C2 18.8801 2 19.7202 2.32698 20.362C2.6146 20.9264 3.07354 21.3854 3.63803 21.673C4.27976 22 5.11984 22 6.8 22H15.2C16.8802 22 17.7202 22 18.362 21.673C18.9265 21.3854 19.3854 20.9264 19.673 20.362C20 19.7202 20 18.8801 20 17.2V13M7.99997 16H9.67452C10.1637 16 10.4083 16 10.6385 15.9447C10.8425 15.8957 11.0376 15.8149 11.2166 15.7053C11.4184 15.5816 11.5914 15.4086 11.9373 15.0627L21.5 5.49998C22.3284 4.67156 22.3284 3.32841 21.5 2.49998C20.6716 1.67156 19.3284 1.67155 18.5 2.49998L8.93723 12.0627C8.59133 12.4086 8.41838 12.5816 8.29469 12.7834C8.18504 12.9624 8.10423 13.1574 8.05523 13.3615C7.99997 13.5917 7.99997 13.8363 7.99997 14.3255V16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        editButton.addEventListener("click", function() {

            document.getElementById("edit-title").value = todo.title;
            document.getElementById("edit-details").value = todo.details;
            document.getElementById("edit-due_date").value = todo.due_date;

            document.querySelectorAll("#edit-modal .priority-choice").forEach((button) => {
                button.classList.toggle("is-selected", button.dataset.priority === todo.priority);
            });

            editingTodoId = todo.id;
            editModal.classList.remove("is-hidden");
        });

        document.getElementById("close-edit-modal").addEventListener("click", function() {
            editModal.classList.add("is-hidden");
        });

        //details button
        const detailsButton = document.createElement("button");
        detailsButton.type = "button";
        detailsButton.className = "todo-details";
        detailsButton.textContent = "Details";

        
        detailsButton.addEventListener("click", function() {
            document.getElementById("details-title").textContent = todo.title;
            document.getElementById("details-details").textContent = todo.details;
            const year = todo.due_date ? todo.due_date.split("-")[0] : "";
            document.getElementById("details-due-date").textContent = todo.due_date ? `${formatDueDate(todo.due_date)} ${year}` : "N/A";
            document.getElementById("details-priority").textContent = todo.priority;

            const project = projects.find((item) => item.id === todo.project_id);
            document.getElementById("details-project").textContent = project ? project.name : "N/A";

            detailsModal.classList.remove("is-hidden");
        });


        li.appendChild(checkbox);
        li.appendChild(title);
        li.appendChild(detailsButton);
        li.appendChild(date);
        li.appendChild(editButton);
        li.appendChild(deleteButton);
        list.appendChild(li);
    }
}

async function loadProjects(){
    const response = await fetch("http://127.0.0.1:5000/projects");
    const data = await response.json();
    projects = data.projects;

    const list = document.querySelector(".projects-list");
    list.innerHTML = "";

    for (const project of data.projects){
        const li = document.createElement("li");
        const button = document.createElement("button");
        const label = document.createElement("span");
        label.className = "nav-projects-name";
        label.textContent = project.name;
        button.type = "button";
        button.className = "nav-projects";
        
        button.dataset.projectId = project.id;

        button.addEventListener("click", function () {
            currentProjectId = Number(button.dataset.projectId);
            currentFilter = "Project";
            document.querySelectorAll(".nav-link, .nav-projects").forEach((link) => {
                link.classList.remove("is-active");
            });
            button.classList.add("is-active");
            loadTodos();
        });
        li.appendChild(button);
        list.appendChild(li);
        button.appendChild(label);
    }
}

loadTodos(); 
loadProjects();

const projectsToggle = document.getElementById("projects-label");
const projectsList = document.querySelector(".projects-list");

projectsToggle.addEventListener("click", function () {
  projectsList.classList.toggle("is-hidden");
});

async function deleteCurrentProject() {
    const response = await fetch(`http://127.0.0.1:5000/projects/${currentProjectId}`, {
        method: "DELETE"
    });

    if (!response.ok) {
        const err = await response.json();
        alert(err.error || "Failed to delete project");
        return;
    }

    currentProjectId = null;
    currentFilter = "Home";
    document.querySelectorAll(".nav-link, .nav-projects").forEach((link) => {
        link.classList.remove("is-active");
    });
    document.querySelector('.nav-link[data-filter="Home"]').classList.add("is-active");
    await loadProjects();
    await loadTodos();
}

document.getElementById("delete-project").addEventListener("click", deleteCurrentProject);
document.getElementById("delete-empty-project").addEventListener("click", deleteCurrentProject);

form.addEventListener("submit", async function(event) {
    event.preventDefault();

    const title = document.getElementById("title").value;
    const details = document.getElementById("details").value;
    const priority = document.querySelector(".priority-choice.is-selected").dataset.priority;
    const due_date = document.getElementById("due_date").value || null;
    const project_id = currentFilter === "Project" ? currentProjectId : null;

    const response = await fetch("http://127.0.0.1:5000/todos", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ title, details, priority, due_date, project_id })
    });

    if (!response.ok){
        const err = await response.json();
        alert(err.error || "Failed to create todo");
        return;
    }

    form.reset();
    await loadTodos();
}); 

document.getElementById("edit-form").addEventListener("submit", async function(event) {
    event.preventDefault();

    const title = document.getElementById("edit-title").value;
    const details = document.getElementById("edit-details").value;
    const due_date = document.getElementById("edit-due_date").value || null;
    const priority = document.querySelector("#edit-modal .priority-choice.is-selected").dataset.priority;

    const response = await fetch(`http://127.0.0.1:5000/todos/${editingTodoId}/edit`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ title, details, due_date, priority })
    });

    if (!response.ok){
        const err = await response.json();
        alert(err.error || "Failed to update todo");
        return;
    }

    editModal.classList.add("is-hidden");
    await loadTodos();
    document.getElementById("success-message").textContent = "Todo updated.";
    const successModal = document.getElementById("success-modal");
    successModal.classList.remove("is-hidden");
    setTimeout(function () {
        successModal.classList.add("is-hidden");
    }, 2000);
});

document.querySelectorAll(".priority-choice").forEach((button) => {
    button.addEventListener("click", function () {
      document.querySelectorAll(".priority-choice").forEach((item) => {
        item.classList.remove("is-selected");
      });
      button.classList.add("is-selected");
    });
  });

const createModal = document.getElementById("create-modal");
const closeModal = document.querySelector("#create-modal .modal-close");

// project form
const projectForm = document.getElementById("project-form");

projectForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const name = document.getElementById("project-name").value;
    const response = await fetch("http://127.0.0.1:5000/projects", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ name })
    });

    if (!response.ok){
        const err = await response.json();
        alert(err.error || "Failed to create project");
        return;
    }

    projectForm.reset();
    createModal.classList.add("is-hidden");
    await loadProjects();
});


const closeDetailsModal = document.querySelector("#details-modal .modal-close");

// toggle add form ( will change later )
addButton.addEventListener("click", function() {
    createModal.classList.remove("is-hidden");

    const todoTab = document.querySelector('.modal-tab[data-panel="todo"]');
    const blocked = currentFilter !== "Project";
    todoTab.classList.toggle("is-blocked", blocked);
    todoTab.disabled = blocked;

    if (blocked) {
        document.querySelector('.modal-tab[data-panel="project"]').click();
    }

    if (currentFilter === "Project") {
        return;
    }
});

closeModal.addEventListener("click", function() {
    createModal.classList.add("is-hidden");
});

closeDetailsModal.addEventListener("click", function() {
    detailsModal.classList.add("is-hidden");
});

document.querySelectorAll(".modal-tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      const name = tab.dataset.panel;
  
      document.querySelectorAll(".modal-tab").forEach((item) => {
        item.classList.remove("is-active");
      });
      tab.classList.add("is-active");
  
      document.querySelectorAll(".modal-panel").forEach((panel) => {
        panel.classList.toggle("is-hidden", panel.dataset.panel !== name);
      });
    });
  });


// sort select
const sortSelect = document.getElementById("sort-select");
sortSelect.addEventListener("change", function () {
    currentSort = sortSelect.value;
    loadTodos();
});

// filter buttons
document.querySelectorAll(".nav-link[data-filter], .nav-projects[data-filter]").forEach((button) => {
    button.addEventListener("click", function () {
      currentFilter = button.dataset.filter;
      document.querySelectorAll(".nav-link, .nav-projects").forEach((link) => {
        link.classList.remove("is-active");
      });
      button.classList.add("is-active");
      loadTodos();
    });
  });