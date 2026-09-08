---
name: roblox-30-avatar-customization
description: "Rige la personalización avanzada de avatares y Layered Clothing en Roblox (skills 521-535): manipulación de HumanoidDescription (ApplyDescription, GetAppliedDescription), deformación de ropa 3D con WrapTarget y WrapLayer, montaje de accesorios por Attachment, calibración de tono de piel y cabello, morphing de escalas corporales sin desincronización de red y serialización cosmética eficiente. Úsala al construir vestidores, tiendas de skins, editores de personajes o sistemas de armaduras visuales."
license: MIT
allowed-tools: Read Write Bash(node:*,luau-lsp:*,rojo:*,wally:*)
metadata:
  domain: "Avatar Customization & Layered Clothing"
  range: "521-535"
  author: "RAASE 2.1 / robloxIA"
---

# roblox-30-avatar-customization — Personalización de Avatares y Layered Clothing (Skills 521 - 535)

Este módulo establece los estándares técnicos de ingeniería para la personalización de personajes R15, soporte de prendas deformables 3D (*Layered Clothing*), gestión de accesorios rígidos y morphing controlado bajo Luau 2026.

## Catálogo de Habilidades Técnicas

### 521. `avatar-humanoid-description-pipeline`
- **Regla:** Toda mutación estética del avatar en tiempo de juego debe aplicarse en el servidor mediante `Humanoid:ApplyDescription()`, siempre encapsulada en un bloque `pcall` estructurado.
- **Ejemplo:**
  ```luau
  --!strict
  local function applyAvatarDescription(humanoid: Humanoid, description: HumanoidDescription): boolean
      local success, err = pcall(function()
          humanoid:ApplyDescription(description)
      end)
      if not success then
          warn(`[AvatarPipeline] Error aplicando HumanoidDescription: {err}`)
          return false
      end
      return true
  end
  ```

### 522. `avatar-description-diff-patching`
- **Regla:** Para aplicar cambios incrementales (equipar un sombrero o cambiar color de camisa), clonar y mutar la descripción activa obtenida mediante `Humanoid:GetAppliedDescription()`, evitando la reconstrucción completa del rig.
- **Ejemplo:**
  ```luau
  --!strict
  local function equipHatIncremental(humanoid: Humanoid, hatAssetId: number): boolean
      local currentDesc = humanoid:GetAppliedDescription()
      local newDesc = currentDesc:Clone()
      newDesc.HatAccessory = if newDesc.HatAccessory == "" 
          then tostring(hatAssetId) 
          else `{newDesc.HatAccessory},{hatAssetId}`
      
      local ok, _ = pcall(function()
          humanoid:ApplyDescription(newDesc)
      end)
      return ok
  end
  ```

### 523. `avatar-layered-clothing-wrap-layers`
- **Regla:** En prendas de Layered Clothing, configurar `WrapLayer.Order` de menor a mayor conforme la prenda se aleja de la piel (e.g., ropa interior = 1, camisa = 2, chaqueta = 3) y calibrar `Puffiness` para prevenir solapamientos visuales (*clipping*).
- **Ejemplo:**
  ```luau
  --!strict
  local function configureLayeredJacket(jacketAccessory: Accessory, orderLayer: number)
      local wrapLayer = jacketAccessory:FindFirstChildWhichIsA("WrapLayer", true)
      if wrapLayer then
          wrapLayer.Order = orderLayer
          wrapLayer.Puffiness = 0.5
          wrapLayer.ShrinkFactor = 0.0
      end
  end
  ```

### 524. `avatar-wrap-target-cage-alignment`
- **Regla:** Verificar la presencia e integridad de las instancias `WrapTarget` en cada pieza anatómica del rig R15 antes de acoplar prendas de ropa deformable.
- **Ejemplo:**
  ```luau
  --!strict
  local function validateR15WrapTargets(character: Model): boolean
      local requiredParts = { "UpperTorso", "LowerTorso", "LeftUpperArm", "RightUpperArm" }
      for _, partName in requiredParts do
          local part = character:FindFirstChild(partName)
          if not part or not part:FindFirstChildOfClass("WrapTarget") then
              return false
          end
      end
      return true
  end
  ```

### 525. `avatar-attachment-accessory-welding`
- **Regla:** El acoplamiento manual de accesorios rígidos debe alinear los `Attachment` homónimos entre el accesorio y la parte corporal correspondiente, creando una soldadura rígida `Weld` y garantizando que todas las piezas del accesorio tengan `Anchored = false`.
- **Ejemplo:**
  ```luau
  --!strict
  local function attachRigidAccessory(character: Model, accessory: Accessory)
      local handle = accessory:FindFirstChild("Handle")
      if not handle or not handle:IsA("BasePart") then return end

      local accAttachment = handle:FindFirstChildOfClass("Attachment")
      if not accAttachment then return end

      local targetAttachment = character:FindFirstChild(accAttachment.Name, true)
      if targetAttachment and targetAttachment:IsA("Attachment") and targetAttachment.Parent:IsA("BasePart") then
          handle.CFrame = targetAttachment.Parent.CFrame * targetAttachment.CFrame * accAttachment.CFrame:Inverse()
          
          local weld = Instance.new("WeldConstraint")
          weld.Part0 = handle
          weld.Part1 = targetAttachment.Parent
          weld.Parent = handle

          handle.Anchored = false
          handle.CanCollide = false
          accessory.Parent = character
      end
  end
  ```

### 526. `avatar-skin-tone-palette-sanitization`
- **Regla:** Los colores de piel deben validarse en el servidor frente a una paleta curada y aplicarse a través de `HumanoidDescription` o `BodyColors` de forma sincrónica en las 6 partes corporales.
- **Ejemplo:**
  ```luau
  --!strict
  local ALLOWED_SKIN_COLORS: { [number]: Color3 } = {
      [1] = Color3.fromRGB(245, 205, 175),
      [2] = Color3.fromRGB(211, 160, 115),
      [3] = Color3.fromRGB(140, 85, 45),
  }

  local function applySafeSkinTone(humanoid: Humanoid, paletteIndex: number)
      local targetColor = ALLOWED_SKIN_COLORS[paletteIndex] or ALLOWED_SKIN_COLORS[1]
      local desc = humanoid:GetAppliedDescription():Clone()
      desc.HeadColor = targetColor
      desc.TorsoColor = targetColor
      desc.LeftArmColor = targetColor
      desc.RightArmColor = targetColor
      desc.LeftLegColor = targetColor
      desc.RightLegColor = targetColor
      pcall(function()
          humanoid:ApplyDescription(desc)
      end)
  end
  ```

### 527. `avatar-hair-accessory-slot-budget`
- **Regla:** Limitar el número simultáneo de accesorios de cabello a un máximo de 3 mallas para prevenir saturación de draw-calls y memoria geométrica en clientes móviles.
- **Ejemplo:**
  ```luau
  --!strict
  local function validateHairBudget(description: HumanoidDescription, maxHairs: number): boolean
      local hairList = string.split(description.HairAccessory, ",")
      local count = 0
      for _, idStr in hairList do
          if string.match(idStr, "%d+") then
              count += 1
          end
      end
      return count <= maxHairs
  end
  ```

### 528. `avatar-scale-morphing-safety-bounds`
- **Regla:** Al alterar proporciones del avatar mediante `HumanoidDescription`, las escalas deben acotarse estrictamente para no deformar hitboxes ni romper la física de colisión:
  - `BodyHeightScale`: $[0.85, 1.15]$
  - `BodyWidthScale`: $[0.85, 1.15]$
  - `HeadScale`: $[0.90, 1.10]$
- **Ejemplo:**
  ```luau
  --!strict
  local function sanitizeScales(desc: HumanoidDescription)
      desc.HeightScale = math.clamp(desc.HeightScale, 0.85, 1.15)
      desc.WidthScale = math.clamp(desc.WidthScale, 0.85, 1.15)
      desc.HeadScale = math.clamp(desc.HeadScale, 0.90, 1.10)
      desc.ProportionScale = math.clamp(desc.ProportionScale, 0.0, 1.0)
  end
  ```

### 529. `avatar-facial-animation-expression-sync`
- **Regla:** En cabezas dinámicas, verificar la presencia de `FaceControls` y animar los pesos de expresión facial en un rango de 0.0 a 1.0 sin sobrescribir transformaciones físicas del cuello.
- **Ejemplo:**
  ```luau
  --!strict
  local function triggerSmile(character: Model, intensity: number)
      local faceControls = character:FindFirstChildWhichIsA("FaceControls", true)
      if faceControls then
          faceControls.MouthSmile = math.clamp(intensity, 0.0, 1.0)
      end
  end
  ```

### 530. `avatar-async-appearance-loading-guards`
- **Regla:** La obtención de apariencias externas con `Players:GetHumanoidDescriptionFromUserId()` debe protegerse con reintentos y contar con un fallback local para evitar bloquear el ciclo de spawn ante fallos de conexión con los servicios web de Roblox.
- **Ejemplo:**
  ```luau
  --!strict
  local Players = game:GetService("Players")

  local function safeLoadUserDescription(userId: number, fallback: HumanoidDescription): HumanoidDescription
      local attempts = 0
      local success = false
      local result: HumanoidDescription? = nil

      while attempts < 3 and not success do
          attempts += 1
          local ok, res = pcall(function()
              return Players:GetHumanoidDescriptionFromUserId(userId)
          end)
          if ok and res then
              success = true
              result = res
          else
              task.wait(0.5 * attempts)
          end
      end

      return if success and result then result else fallback:Clone()
  end
  ```

### 531. `avatar-collision-fidelity-accessory-tuning`
- **Regla:** Todas las partes dentro de un accesorio estético deben tener `CanCollide = false`, `CanTouch = false` y `CanQuery = false` para erradicar sobrecostos de detección física y evitar que el personaje se atasque con la geometría del escenario.
- **Ejemplo:**
  ```luau
  --!strict
  local function stripAccessoryCollisions(accessory: Accessory)
      for _, desc in accessory:GetDescendants() do
          if desc:IsA("BasePart") then
              desc.CanCollide = false
              desc.CanTouch = false
              desc.CanQuery = false
              desc.Massless = true
          end
      end
  end
  ```

### 532. `avatar-custom-character-morph-pipeline`
- **Regla:** Al transformar a un jugador en un rig o morph customizado, clonar el modelo en `ServerScriptService`, asignar `Player.Character = newModel` y asegurar la presencia de los scripts esenciales de control (`Animate`, `Humanoid` y `HumanoidRootPart`).
- **Ejemplo:**
  ```luau
  --!strict
  local function morphPlayer(player: Player, morphPrefab: Model, spawnCFrame: CFrame)
      local newChar = morphPrefab:Clone()
      newChar.Name = player.Name
      newChar:PivotTo(spawnCFrame)

      local rootPart = newChar:FindFirstChild("HumanoidRootPart")
      if rootPart and rootPart:IsA("BasePart") then
          rootPart:SetNetworkOwner(player)
      end

      player.Character = newChar
      newChar.Parent = workspace
  end
  ```

### 533. `avatar-layered-clothing-memory-budget`
- **Regla:** Imponer un límite duro de máximo 5 prendas de Layered Clothing activas simultáneamente en un personaje para garantizar estabilidad de framerate en dispositivos de gama baja.
- **Ejemplo:**
  ```luau
  --!strict
  local MAX_LAYERED_GARMENTS = 5

  local function enforceLayeredGarmentLimit(character: Model): boolean
      local garmentCount = 0
      for _, item in character:GetChildren() do
          if item:IsA("Accessory") and item:FindFirstChildWhichIsA("WrapLayer", true) then
              garmentCount += 1
          end
      end
      return garmentCount <= MAX_LAYERED_GARMENTS
  end
  ```

### 534. `avatar-replicated-preview-viewport`
- **Regla:** Para previsualizaciones de personalización en menús de interfaz, renderizar un clon cosmético no anclado dentro de un `ViewportFrame` utilizando `WorldModel` para permitir la ejecución de animaciones e iluminación sintética.
- **Ejemplo:**
  ```luau
  --!strict
  local function setupPreviewModel(viewport: ViewportFrame, sourceRig: Model): Model
      local worldModel = viewport:FindFirstChildOfClass("WorldModel")
      if not worldModel then
          worldModel = Instance.new("WorldModel")
          worldModel.Parent = viewport
      end

      local previewRig = sourceRig:Clone()
      previewRig.Parent = worldModel
      return previewRig
  end
  ```

### 535. `avatar-persistence-serialization`
- **Regla:** Guardar configuraciones estéticas en DataStores serializando únicamente los IDs numéricos de accesorios y escalas corporales en estructuras de datos compactas, nunca guardando instancias completas.
- **Ejemplo:**
  ```luau
  --!strict
  export type SerializedAvatarData = {
      hats: { number },
      shirt: number,
      pants: number,
      skinColorRgb: { number },
      heightScale: number,
  }

  local function serializeAppearance(desc: HumanoidDescription): SerializedAvatarData
      local color = desc.HeadColor
      return {
          hats = {},
          shirt = desc.Shirt,
          pants = desc.Pants,
          skinColorRgb = { math.floor(color.R * 255), math.floor(color.G * 255), math.floor(color.B * 255) },
          heightScale = desc.HeightScale,
      }
  end
  ```

## Reglas Inviolables

1. **Mutación estética server-authoritative:** `Humanoid:ApplyDescription()` debe invocarse siempre en el servidor. Las modificaciones directas en el cliente no se replican ni son confiables.
2. **Accesorios inofensivos para la física:** Toda pieza de accesorio debe tener estrictamente `CanCollide = false`, `CanTouch = false` y `Massless = true`.
3. **Encapsulación obligatoria en `pcall`:** Las llamadas a `ApplyDescription()` y consultas web a `Players:GetHumanoidDescriptionFromUserId()` deben encapsularse en `pcall` para amortiguar caídas de servicios.
4. **Presupuesto estricto de prendas:** Prohibido exceder 5 capas de ropa deformable (`WrapLayer`) o 3 accesorios de cabello por avatar para proteger los límites de memoria móvil.
5. **Sanitización de escalas corporales:** Toda alteración de escala debe validar topes mínimos y máximos para evitar exploits que rompan la geometría de colisión o proyectiles.
