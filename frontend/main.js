let currentFilter = "Home";
const form = document.getElementById("todo-form");
const addButton = document.querySelector(".add-button");

// makes due date Month / Day only
function formatDueDate(dateString) {
  if (!dateString) return "";

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"];
  const [, month, day] = dateString.split("-").map(Number);

  return `${months[month - 1]} ${day}`;
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


    const list = document.getElementById("todo-list")
    list.innerHTML = "";

    for (const todo of todos){

        // list items
        const li = document.createElement("li");
        const dateText = todo.due_date ? ` - ${formatDueDate(todo.due_date)}` : "";
        li.textContent = `${todo.title} (${todo.priority}) ${dateText}`;

        // delete buttons
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
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

        li.appendChild(checkbox);
        li.appendChild(deleteButton);
        list.appendChild(li); // append once, after button is attached
    }
}

loadTodos();


form.addEventListener("submit", async function(event) {
    event.preventDefault();

    const title = document.getElementById("title").value;
    const details = document.getElementById("details").value;
    const priority = document.getElementById("priority").value;
    const due_date = document.getElementById("due_date").value || null;

    const response = await fetch("http://127.0.0.1:5000/todos", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ title, details, priority, due_date })
    });

    if (!response.ok){
        const err = await response.json();
        alert(err.error || "Failed to create todo");
        return;
    }

    form.reset();
    await loadTodos();
}); 


// toggle add form ( will change later )
addButton.addEventListener("click", function() {
    form.classList.toggle("is-hidden");
});

// filter buttons
document.querySelectorAll(".nav-link[data-filter]").forEach((button) => {
    button.addEventListener("click", function () {
      currentFilter = button.dataset.filter;
      document.querySelectorAll(".nav-link").forEach((link) => {
        link.classList.remove("is-active");
      });
      button.classList.add("is-active");
      loadTodos();
    });
  });