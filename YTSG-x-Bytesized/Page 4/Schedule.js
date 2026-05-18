document.addEventListener('DOMContentLoaded', () => {
    const addButton = document.querySelector('.add-button');
    const editorSheet = document.querySelector('.editor-sheet');
    const closeButton = document.querySelector('.editor-close');
    const saveButton = document.querySelector('.editor-save');
    const tabs = document.querySelectorAll('.editor-tab');
    const columns = document.querySelectorAll('.editor-column');

    if (!editorSheet || !addButton) return;

    addButton.addEventListener('click', () => {
        editorSheet.classList.add('open');
        editorSheet.setAttribute('aria-hidden', 'false');
    });

    const closeEditor = () => {
        editorSheet.classList.remove('open');
        editorSheet.setAttribute('aria-hidden', 'true');
    };

    closeButton.addEventListener('click', closeEditor);
    saveButton.addEventListener('click', closeEditor);

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            const tabType = tab.getAttribute('data-type');

            tabs.forEach((otherTab) => {
                const selected = otherTab === tab;
                otherTab.classList.toggle('active', selected);
                otherTab.setAttribute('aria-selected', selected.toString());
            });

            columns.forEach((column) => {
                if (column.classList.contains(`editor-${tabType}`)) {
                    column.style.display = 'grid';
                } else {
                    column.style.display = 'none';
                }
            });
        });
    });

    // Initialize: show only event column by default
    const eventColumn = document.querySelector('.editor-event');
    const projectColumn = document.querySelector('.editor-project');
    if (eventColumn) eventColumn.style.display = 'grid';
    if (projectColumn) projectColumn.style.display = 'none';
});