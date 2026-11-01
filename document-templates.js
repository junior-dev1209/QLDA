(() => {
  const $ = (id) => document.getElementById(id);
  const dialog = $("documentTemplateDialog");
  if (!dialog) return;

  const libraryPanel = $("documentTemplateLibrary");
  const editorPanel = $("documentTemplateEditor");
  const libraryTab = $("documentTemplateLibraryTab");
  const createTab = $("documentTemplateCreateTab");
  const fileInput = $("documentTemplateFile");
  const canvas = $("documentTemplateCanvas");
  const stage = $("documentTemplateCanvasStage");
  const surface = $("documentTemplateCanvasSurface");
  const markers = $("documentTemplateFieldMarkers");
  const fieldList = $("documentTemplateFieldList");
  const status = $("documentTemplateStatus");
  const fillForm = $("documentTemplateFill");
  const libs = new Map();
  const state = {
    accountKey: "",
    file: null,
    bytes: null,
    kind: "",
    pdf: null,
    page: 1,
    pageCount: 0,
    fields: [],
    pendingField: null,
    ocrText: "",
    templates: [],
    activeTemplate: null,
  };

  function accountKey() {
    const account = typeof currentAccount === "function" ? currentAccount() : null;
    return account ? String(account.id || account.username || "") : "";
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("phuc-thinh-document-templates", 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("templates")) request.result.createObjectStore("templates", { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Kho mẫu văn bản chưa sẵn sàng."));
      request.onblocked = () => reject(new Error("Đang có phiên khác giữ kho mẫu. Hãy đóng tab ứng dụng khác rồi thử lại."));
    });
  }

  async function idb(action, value) {
    const db = await openDb();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction("templates", action === "getAll" ? "readonly" : "readwrite");
        const store = tx.objectStore("templates");
        const request = action === "getAll" ? store.getAll() : action === "put" ? store.put(value) : store.delete(value);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Không thể cập nhật kho mẫu."));
        tx.onabort = () => reject(tx.error || new Error("Không thể hoàn tất thao tác với kho mẫu."));
      });
    } finally {
      db.close();
    }
  }

  function currentScope() {
    const id = accountKey();
    if (!id) throw new Error("Vui lòng đăng nhập trước khi sử dụng Mẫu văn bản.");
    return id;
  }

  async function loadTemplates() {
    state.accountKey = currentScope();
    state.templates = (await idb("getAll")).filter((item) => item.accountKey === state.accountKey)
      .sort((a, b) => Number(b.updatedAt || b.createdAt) - Number(a.updatedAt || a.createdAt));
    renderTemplateList();
  }

  function setTab(tab) {
    const create = tab === "create";
    libraryTab.classList.toggle("is-active", !create);
    createTab.classList.toggle("is-active", create);
    libraryTab.setAttribute("aria-selected", String(!create));
    createTab.setAttribute("aria-selected", String(create));
    libraryPanel.classList.toggle("is-hidden", create);
    editorPanel.classList.toggle("is-hidden", !create);
    libraryPanel.toggleAttribute("inert", create);
    editorPanel.toggleAttribute("inert", !create);
    libraryPanel.setAttribute("aria-hidden", String(create));
    editorPanel.setAttribute("aria-hidden", String(!create));
  }

  function openDialog() {
    try {
      currentScope();
      dialog.classList.remove("is-hidden");
      dialog.setAttribute("aria-hidden", "false");
      setTab("library");
      fillForm.classList.add("is-hidden");
      loadTemplates().catch(showError);
      $("documentTemplateClose").focus();
    } catch (error) {
      if (typeof window.showToast === "function") window.showToast(error.message, "error");
    }
  }

  function closeDialog() {
    dialog.classList.add("is-hidden");
    dialog.setAttribute("aria-hidden", "true");
    state.pendingField = null;
    $("assistantDocumentTemplates")?.focus();
  }

  function showError(error) {
    status.textContent = error?.message || "Không thể xử lý tệp này. Hãy thử lại bằng PDF, DOCX, PNG hoặc JPG.";
    status.classList.add("is-error");
  }

  function setStatus(message, error = false) {
    status.textContent = message;
    status.classList.toggle("is-error", error);
  }

  function loadScript(path, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    if (libs.has(globalName)) return libs.get(globalName);
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = path;
      script.async = true;
      script.onload = () => window[globalName] ? resolve(window[globalName]) : reject(new Error(`Không tải được công cụ ${globalName}.`));
      script.onerror = () => reject(new Error("Không tải được thành phần xử lý tài liệu. Hãy tải lại trang và thử lại."));
      document.head.append(script);
    });
    libs.set(globalName, promise);
    return promise;
  }

  async function pdfJs() {
    if (!libs.has("pdfjs")) {
      const promise = import("./assets/document-tools/pdf.min.mjs").then((module) => {
        module.GlobalWorkerOptions.workerSrc = new URL("./assets/document-tools/pdf.worker.min.mjs", document.baseURI).href;
        return module;
      });
      libs.set("pdfjs", promise);
    }
    return libs.get("pdfjs");
  }

  function decodeXml(value) {
    const element = document.createElement("textarea");
    element.innerHTML = value;
    return element.value;
  }

  function slug(value) {
    return String(value || "field").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "field";
  }

  function wordTextAndTags(zip) {
    const xml = zip.file("word/document.xml")?.asText();
    if (!xml) throw new Error("Tệp DOCX không có nội dung Word hợp lệ.");
    const paragraphs = [...xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((match) => {
      const text = [...match[0].matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map((item) => decodeXml(item[1])).join("");
      return text.trim();
    }).filter(Boolean);
    const tags = new Set();
    for (const paragraph of paragraphs) {
      for (const match of paragraph.matchAll(/\{([A-Za-z][A-Za-z0-9_]{0,39})\}/g)) tags.add(match[1]);
    }
    return { text: paragraphs.join("\n"), tags: [...tags] };
  }

  function renderFields() {
    fieldList.replaceChildren();
    markers.replaceChildren();
    if (!state.fields.length) {
      fieldList.innerHTML = '<p class="muted">Chưa có trường điền.</p>';
      $("documentTemplateSave").disabled = !state.file;
      return;
    }
    state.fields.forEach((field, index) => {
      const row = document.createElement("div");
      row.className = "document-template-field-item";
      const description = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = field.label;
      const key = document.createElement("span");
      key.textContent = field.kind === "docx" ? `{${field.key}}` : field.kind === "acroform" ? `Trường PDF: ${field.key}` : `Trang ${field.page}`;
      description.append(title, key);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "ghost";
      remove.textContent = "Bỏ";
      remove.setAttribute("aria-label", `Bỏ trường ${field.label}`);
      remove.addEventListener("click", () => {
        state.fields.splice(index, 1);
        renderFields();
      });
      row.append(description, remove);
      fieldList.append(row);

      if (field.kind === "overlay" && field.page === state.page) {
        const marker = document.createElement("span");
        marker.className = "document-template-field-marker";
        marker.textContent = field.label;
        marker.style.left = `${field.x * 100}%`;
        marker.style.top = `${field.y * 100}%`;
        marker.style.width = `${field.w * 100}%`;
        marker.style.height = `${field.h * 100}%`;
        markers.append(marker);
      }
    });
    $("documentTemplateSave").disabled = !state.file || !state.fields.length;
  }

  function renderTemplateList() {
    const list = $("documentTemplateList");
    list.replaceChildren();
    if (!state.templates.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "Chưa có mẫu. Chọn “Tạo mẫu từ tệp” để bắt đầu.";
      list.append(empty);
      return;
    }
    for (const template of state.templates) {
      const row = document.createElement("article");
      row.className = "document-template-card";
      const details = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = template.name;
      const note = document.createElement("p");
      note.textContent = `${template.sourceName} · ${template.fields.length} trường · ${new Date(template.updatedAt || template.createdAt).toLocaleDateString("vi-VN")}`;
      details.append(title, note);
      const actions = document.createElement("div");
      actions.className = "document-template-card-actions";
      const use = document.createElement("button");
      use.type = "button";
      use.textContent = "Dùng mẫu";
      use.addEventListener("click", () => openFillForm(template));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "ghost";
      remove.textContent = "Xóa";
      remove.addEventListener("click", async () => {
        if (!window.confirm(`Xóa mẫu “${template.name}” trên trình duyệt này?`)) return;
        try {
          await idb("delete", template.id);
          await loadTemplates();
          fillForm.classList.add("is-hidden");
        } catch (error) { showError(error); }
      });
      actions.append(use, remove);
      row.append(details, actions);
      list.append(row);
    }
  }

  function clearEditor() {
    state.file = null;
    state.bytes = null;
    state.kind = "";
    state.pdf = null;
    state.page = 1;
    state.pageCount = 0;
    state.fields = [];
    state.pendingField = null;
    state.ocrText = "";
    canvas.width = 0;
    canvas.height = 0;
    stage.classList.add("is-hidden");
    $("documentTemplateTextPreview").classList.add("is-hidden");
    $("documentTemplateOcrResult").classList.add("is-hidden");
    $("documentTemplateOcrText").textContent = "";
    $("documentTemplateOcr").disabled = true;
    $("documentTemplateSave").disabled = true;
    $("documentTemplateName").value = "";
    $("documentTemplateAddField").classList.remove("is-hidden");
    $("documentTemplateFieldHelp").textContent = "PDF/ảnh: thêm trường rồi chọn vị trí trên trang. Word: thêm các dấu {ten_truong} vào tài liệu trước khi tải lên.";
    $("documentTemplatePageLabel").textContent = "Chưa chọn tệp";
    renderFields();
  }

  async function fileAsBytes(file) {
    return file.arrayBuffer();
  }

  async function handleFile(file) {
    clearEditor();
    if (!file) return;
    if (file.size > 30 * 1024 * 1024) throw new Error("Mỗi mẫu tối đa 30 MB để tránh chiếm quá nhiều dung lượng trình duyệt.");
    const ext = file.name.split(".").pop().toLowerCase();
    const kind = ext === "pdf" ? "pdf" : ext === "docx" ? "docx" : ["png", "jpg", "jpeg"].includes(ext) ? "image" : "";
    if (!kind) throw new Error("Định dạng hỗ trợ: PDF, DOCX, PNG và JPG/JPEG.");
    state.file = file;
    state.bytes = await fileAsBytes(file);
    state.kind = kind;
    $("documentTemplateName").value = file.name.replace(/\.[^.]+$/, "");

    if (kind === "docx") {
      const PizZip = await loadScript("./assets/document-tools/pizzip.min.js", "PizZip");
      await loadScript("./assets/document-tools/docxtemplater.min.js", "docxtemplater");
      const extracted = wordTextAndTags(new PizZip(state.bytes));
      $("documentTemplateTextPreview").textContent = extracted.text || "Tài liệu chưa có văn bản ở phần thân chính.";
      $("documentTemplateTextPreview").classList.remove("is-hidden");
      $("documentTemplateFieldHelp").textContent = "Trong Word, đặt dấu {ten_truong} tại mỗi vị trí cần điền rồi tải DOCX lên. Luna phát hiện dấu trường để tạo biểu mẫu; bố cục và bản gốc được giữ riêng.";
      state.fields = extracted.tags.map((key) => ({ key, label: key.replace(/_/g, " "), kind: "docx" }));
      setStatus(state.fields.length ? `Đã đọc DOCX và nhận ra ${state.fields.length} dấu trường.` : "DOCX chưa có dấu trường. Thêm {ten_truong} ở vị trí cần điền trong Word rồi chọn lại tệp.");
      $("documentTemplateAddField").classList.add("is-hidden");
      $("documentTemplateOcr").disabled = true;
      renderFields();
      return;
    }

    $("documentTemplateFieldHelp").textContent = "PDF/ảnh: thêm tên và nhãn trường, sau đó bấm vào vị trí cần điền trên bản xem trước. Có thể nhận diện OCR để gợi ý các nhãn có dấu hai chấm; cần kiểm tra lại trước khi lưu.";
    $("documentTemplateAddField").classList.remove("is-hidden");
    $("documentTemplateOcr").disabled = false;
    $("documentTemplateTextPreview").classList.add("is-hidden");
    if (kind === "pdf") {
      const pdfjs = await pdfJs();
      state.pdf = await pdfjs.getDocument({ data: new Uint8Array(state.bytes), isEvalSupported: false }).promise;
      state.pageCount = state.pdf.numPages;
      await loadPdfFormFields();
      await renderPage();
      setStatus(`Đã mở PDF gồm ${state.pageCount} trang. Chọn trang, tạo trường và đặt vùng trên bản xem trước.`);
    } else {
      state.pageCount = 1;
      await renderImage(file);
      setStatus("Đã mở ảnh. Thêm trường rồi chọn vùng trên bản xem trước.");
    }
    renderFields();
  }

  async function loadPdfFormFields() {
    try {
      const PDFLib = await loadScript("./assets/document-tools/pdf-lib.min.js", "PDFLib");
      const pdf = await PDFLib.PDFDocument.load(state.bytes, { ignoreEncryption: false, updateMetadata: false });
      const form = pdf.getForm();
      const fields = form.getFields().filter((field) => field.constructor?.name === "PDFTextField");
      state.fields = fields.map((field) => ({ key: field.getName(), label: field.getName().replace(/[_.]/g, " "), kind: "acroform" }));
    } catch {
      state.fields = [];
    }
  }

  function scaleCanvasToStage() {
    surface.style.aspectRatio = `${canvas.width} / ${canvas.height}`;
    canvas.style.width = "100%";
    canvas.style.height = "auto";
  }

  async function renderPage() {
    if (!state.pdf) return;
    const page = await state.pdf.getPage(state.page);
    const viewport = page.getViewport({ scale: 1.4 });
    const context = canvas.getContext("2d", { alpha: false });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport, canvas }).promise;
    state.viewport = viewport;
    state.pageText = await page.getTextContent();
    stage.classList.remove("is-hidden");
    scaleCanvasToStage();
    $("documentTemplatePageLabel").textContent = `Trang ${state.page} / ${state.pageCount}`;
    $("documentTemplatePreviousPage").disabled = state.page <= 1;
    $("documentTemplateNextPage").disabled = state.page >= state.pageCount;
    renderFields();
  }

  async function renderImage(file) {
    const image = await createImageBitmap(file);
    const scale = Math.min(1.4, 1800 / image.width);
    canvas.width = Math.ceil(image.width * scale);
    canvas.height = Math.ceil(image.height * scale);
    canvas.getContext("2d", { alpha: false }).drawImage(image, 0, 0, canvas.width, canvas.height);
    image.close();
    stage.classList.remove("is-hidden");
    scaleCanvasToStage();
    $("documentTemplatePageLabel").textContent = "Ảnh · trang 1 / 1";
    $("documentTemplatePreviousPage").disabled = true;
    $("documentTemplateNextPage").disabled = true;
    renderFields();
  }

  function addOverlayField(key, label, x, y) {
    if (state.fields.some((field) => field.key === key)) throw new Error("Tên trường này đã được dùng.");
    state.fields.push({ key, label, kind: "overlay", page: state.page, x: Math.max(0, Math.min(0.72, x)), y: Math.max(0, Math.min(0.96, y)), w: 0.27, h: 0.035 });
    renderFields();
  }

  function suggestPdfTextFields() {
    const items = state.pageText?.items || [];
    const found = [];
    for (const item of items) {
      const label = String(item.str || "").trim();
      if (!/:$/.test(label) || !item.transform || !label.replace(/[:\s]/g, "")) continue;
      const point = state.viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
      const x = Math.min(0.72, Math.max(0.02, (point[0] + Number(item.width || 0) * state.viewport.scale + 8) / canvas.width));
      const y = Math.min(0.95, Math.max(0.015, (point[1] - Number(item.height || 10) * state.viewport.scale * 1.3) / canvas.height));
      found.push({ label: label.replace(/:$/, "").trim(), x, y });
    }
    for (const line of found) {
      const key = slug(line.label);
      if (!state.fields.some((field) => field.key === key)) state.fields.push({ key, label: line.label, kind: "overlay", page: state.page, x: line.x, y: line.y, w: Math.min(0.27, 0.97 - line.x), h: 0.035 });
    }
    renderFields();
    return found.length;
  }

  async function recognizePage() {
    if (!canvas.width) throw new Error("Hãy chọn tệp và trang trước khi chạy nhận diện.");
    setStatus("Đang tải bộ OCR tiếng Việt lần đầu và nhận diện trang…");
    $("documentTemplateOcr").disabled = true;
    try {
      const Tesseract = await loadScript("./assets/document-tools/tesseract.min.js", "Tesseract");
      const base = new URL("./assets/document-tools/", document.baseURI);
      const worker = await Tesseract.createWorker("vie", 1, {
        workerPath: new URL("worker.min.js", base).href,
        corePath: new URL("", base).href,
        langPath: new URL("", base).href,
        gzip: true,
        logger: (message) => {
          if (message.status === "recognizing text") setStatus(`Đang nhận diện chữ tiếng Việt: ${Math.round((message.progress || 0) * 100)}%`);
        },
      });
      try {
        const result = await worker.recognize(canvas);
        const lines = result.data.lines || [];
        state.ocrText = result.data.text || "";
        $("documentTemplateOcrText").textContent = state.ocrText || "Không nhận ra văn bản trên trang này.";
        $("documentTemplateOcrResult").classList.remove("is-hidden");
        let suggestions = 0;
        for (const line of lines) {
          const label = String(line.text || "").trim().replace(/[\s_\-.]+$/, "");
          if (!/:$/.test(label) || !line.bbox) continue;
          const key = slug(label.replace(/:$/, ""));
          if (!key || state.fields.some((field) => field.key === key)) continue;
          const x = Math.min(0.72, Math.max(0.02, (line.bbox.x1 + 8) / canvas.width));
          const y = Math.min(0.95, Math.max(0.015, (line.bbox.y0 - 3) / canvas.height));
          state.fields.push({ key, label: label.replace(/:$/, ""), kind: "overlay", page: state.page, x, y, w: Math.min(0.27, 0.97 - x), h: Math.min(0.05, Math.max(0.026, (line.bbox.y1 - line.bbox.y0 + 10) / canvas.height)) });
          suggestions++;
        }
        if (state.kind === "pdf" && state.pageText?.items?.length) suggestions += suggestPdfTextFields();
        renderFields();
        setStatus(`OCR hoàn tất. ${suggestions} gợi ý trường; hãy soát lại nội dung và vị trí trước khi lưu.`);
      } finally {
        await worker.terminate();
      }
    } finally {
      $("documentTemplateOcr").disabled = false;
    }
  }

  function renderTemplateFieldMarkers() {
    markers.replaceChildren();
    state.fields.filter((field) => field.kind === "overlay" && field.page === state.page).forEach((field) => {
      const marker = document.createElement("span");
      marker.className = "document-template-field-marker";
      marker.textContent = field.label;
      marker.style.left = `${field.x * 100}%`;
      marker.style.top = `${field.y * 100}%`;
      marker.style.width = `${field.w * 100}%`;
      marker.style.height = `${field.h * 100}%`;
      markers.append(marker);
    });
  }

  async function saveTemplate() {
    const scope = currentScope();
    if (scope !== state.accountKey) throw new Error("Tài khoản đã thay đổi. Hãy đóng và mở lại Mẫu văn bản.");
    const name = $("documentTemplateName").value.trim();
    if (!state.file || !name || !state.fields.length) throw new Error("Nhập tên mẫu và xác nhận ít nhất một trường cần điền.");
    const now = Date.now();
    const template = {
      id: crypto.randomUUID(),
      accountKey: state.accountKey,
      name,
      sourceName: state.file.name,
      mimeType: state.file.type || (state.kind === "pdf" ? "application/pdf" : state.kind === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "image/png"),
      kind: state.kind,
      bytes: state.bytes,
      fields: state.fields.map((field) => ({ ...field })),
      pageCount: state.pageCount,
      createdAt: now,
      updatedAt: now,
    };
    await idb("put", template);
    await loadTemplates();
    setTab("library");
    setStatus("Đã lưu mẫu trên trình duyệt này; tệp gốc không bị thay đổi.");
  }

  function openFillForm(template) {
    state.activeTemplate = template;
    $("documentTemplateFillTitle").textContent = `Điền mẫu: ${template.name}`;
    const fields = $("documentTemplateFillFields");
    fields.replaceChildren();
    for (const item of template.fields) {
      const label = document.createElement("label");
      label.textContent = item.label;
      const input = document.createElement(item.key.toLowerCase().includes("noi_dung") || item.key.toLowerCase().includes("ly_do") ? "textarea" : "input");
      input.name = item.key;
      input.required = false;
      if (input.tagName === "TEXTAREA") input.rows = 3;
      label.append(input);
      fields.append(label);
    }
    $("documentTemplateList").classList.add("is-hidden");
    fillForm.classList.remove("is-hidden");
    fields.querySelector("input,textarea")?.focus();
  }

  function wrapCanvasText(context, value, maxWidth) {
    const lines = [];
    String(value || "").split(/\r?\n/).forEach((paragraph) => {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (line && context.measureText(next).width > maxWidth) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      lines.push(line);
    });
    return lines;
  }

  async function canvasData(canvasElement) {
    const blob = await new Promise((resolve, reject) => canvasElement.toBlob((value) => value ? resolve(value) : reject(new Error("Không thể tạo lớp chữ cho PDF.")), "image/png"));
    return blob.arrayBuffer();
  }

  async function makeOverlayImage(value, field) {
    const width = 900;
    const height = Math.max(48, Math.round(width * field.h / field.w));
    const output = document.createElement("canvas");
    output.width = width;
    output.height = height;
    const context = output.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    const fontSize = Math.min(48, Math.max(18, Math.floor(height * 0.48)));
    context.fillStyle = "#172b3a";
    context.font = `${fontSize}px Arial, sans-serif`;
    context.textBaseline = "middle";
    const lines = wrapCanvasText(context, value, width - 28);
    const lineHeight = Math.ceil(fontSize * 1.24);
    const fitScale = Math.min(1, (height - 8) / Math.max(lineHeight, lines.length * lineHeight));
    if (fitScale < 1) context.font = `${Math.max(12, Math.floor(fontSize * fitScale))}px Arial, sans-serif`;
    const adjustedLineHeight = Math.ceil(fontSize * fitScale * 1.24);
    lines.forEach((line, index) => context.fillText(line, 12, Math.min(height - adjustedLineHeight / 2, adjustedLineHeight * (index + 0.5))));
    return canvasData(output);
  }

  async function fillPdf(template, values) {
    const PDFLib = await loadScript("./assets/document-tools/pdf-lib.min.js", "PDFLib");
    const pdf = await PDFLib.PDFDocument.load(template.bytes, { ignoreEncryption: false, updateMetadata: true });
    const form = pdf.getForm();
    for (const field of template.fields.filter((item) => item.kind === "acroform")) {
      try { form.getTextField(field.key).setText(values[field.key] || ""); } catch { /* Keep unknown form fields untouched. */ }
    }
    for (const field of template.fields.filter((item) => item.kind === "overlay")) {
      const page = pdf.getPage(field.page - 1);
      const { width, height } = page.getSize();
      const imageBytes = await makeOverlayImage(values[field.key], field);
      const image = await pdf.embedPng(imageBytes);
      page.drawImage(image, { x: field.x * width, y: (1 - field.y - field.h) * height, width: field.w * width, height: field.h * height });
    }
    if (template.fields.some((item) => item.kind === "acroform")) form.flatten();
    return new Blob([await pdf.save()], { type: "application/pdf" });
  }

  async function fillImage(template, values) {
    const PDFLib = await loadScript("./assets/document-tools/pdf-lib.min.js", "PDFLib");
    const pdf = await PDFLib.PDFDocument.create();
    const isJpeg = /jpe?g/i.test(template.mimeType || template.sourceName);
    const source = isJpeg ? await pdf.embedJpg(template.bytes) : await pdf.embedPng(template.bytes);
    const width = 595.28;
    const height = width * source.height / source.width;
    const page = pdf.addPage([width, height]);
    page.drawImage(source, { x: 0, y: 0, width, height });
    for (const field of template.fields.filter((item) => item.kind === "overlay")) {
      const imageBytes = await makeOverlayImage(values[field.key], field);
      const image = await pdf.embedPng(imageBytes);
      page.drawImage(image, { x: field.x * width, y: (1 - field.y - field.h) * height, width: field.w * width, height: field.h * height });
    }
    return new Blob([await pdf.save()], { type: "application/pdf" });
  }

  async function fillDocx(template, values) {
    const PizZip = await loadScript("./assets/document-tools/pizzip.min.js", "PizZip");
    const Docxtemplater = await loadScript("./assets/document-tools/docxtemplater.min.js", "docxtemplater");
    const zip = new PizZip(template.bytes);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(values);
    return doc.getZip().generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  async function createDocument(event) {
    event.preventDefault();
    const template = state.activeTemplate;
    if (!template || template.accountKey !== currentScope()) throw new Error("Mẫu không còn sẵn sàng trong tài khoản này.");
    const values = Object.fromEntries(new FormData(fillForm).entries());
    const blob = template.kind === "docx" ? await fillDocx(template, values)
      : template.kind === "image" ? await fillImage(template, values)
        : await fillPdf(template, values);
    const baseName = template.name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "van-ban";
    const ext = template.kind === "docx" ? "docx" : "pdf";
    download(blob, `${baseName}-${new Date().toISOString().slice(0, 10)}.${ext}`);
    setStatus("Đã tạo và tải xuống bản mới. Tệp mẫu gốc vẫn được giữ nguyên.");
  }

  $("assistantDocumentTemplates").addEventListener("click", openDialog);
  $("documentTemplateClose").addEventListener("click", closeDialog);
  dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDialog(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !dialog.classList.contains("is-hidden")) closeDialog(); });
  libraryTab.addEventListener("click", () => setTab("library"));
  createTab.addEventListener("click", () => setTab("create"));
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    fileInput.value = "";
    try { await handleFile(file); }
    catch (error) { showError(error); }
  });
  $("documentTemplateAddField").addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      if (state.kind === "docx") throw new Error("Trường Word cần có dấu {ten_truong} trong tệp trước khi tải lên.");
      if (!canvas.width) throw new Error("Hãy chọn tệp và chờ bản xem trước hiển thị.");
      const key = slug($("documentTemplateFieldKey").value.trim());
      const label = $("documentTemplateFieldLabel").value.trim();
      if (!key || !label) throw new Error("Nhập tên trường và nhãn hiển thị.");
      state.pendingField = { key, label };
      setStatus(`Bấm vào vị trí cần điền “${label}” trên trang.`);
      stage.classList.add("is-placing-field");
    } catch (error) { showError(error); }
  });
  stage.addEventListener("click", (event) => {
    if (!state.pendingField || event.target.closest(".document-template-field-marker")) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    try {
      addOverlayField(state.pendingField.key, state.pendingField.label, x, y);
      $("documentTemplateFieldKey").value = "";
      $("documentTemplateFieldLabel").value = "";
      state.pendingField = null;
      stage.classList.remove("is-placing-field");
      setStatus("Đã đặt vùng điền. Kiểm tra vị trí và kích thước trường trước khi lưu mẫu.");
    } catch (error) { showError(error); }
  });
  $("documentTemplatePreviousPage").addEventListener("click", async () => { if (state.page > 1) { state.page--; await renderPage(); } });
  $("documentTemplateNextPage").addEventListener("click", async () => { if (state.page < state.pageCount) { state.page++; await renderPage(); } });
  $("documentTemplateOcr").addEventListener("click", async () => { try { await recognizePage(); } catch (error) { showError(error); } });
  $("documentTemplateSave").addEventListener("click", async () => {
    try { await saveTemplate(); }
    catch (error) { showError(error); }
  });
  $("documentTemplateBack").addEventListener("click", () => {
    fillForm.classList.add("is-hidden");
    $("documentTemplateList").classList.remove("is-hidden");
  });
  fillForm.addEventListener("submit", async (event) => {
    const submit = fillForm.querySelector('[type="submit"]');
    submit.disabled = true;
    try { await createDocument(event); }
    catch (error) { showError(error); }
    finally { submit.disabled = false; }
  });

  window.openDocumentTemplateManager = openDialog;
})();
