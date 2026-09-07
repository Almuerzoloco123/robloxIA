--!strict
--[[
    Janitor Pattern Implementation in Strict Luau
    Erradicates memory leaks by managing lifecycle of RBXScriptConnections,
    Instances, thread cancellations, and cleanup callbacks.
--]]

type CleanupTask = RBXScriptConnection | Instance | thread | () -> () | { Destroy: (any) -> () }

export type Janitor = {
	Add: <T>(self: Janitor, task: T, methodName: string?) -> T,
	Remove: (self: Janitor, task: CleanupTask) -> (),
	Cleanup: (self: Janitor) -> (),
	Destroy: (self: Janitor) -> (),
}

local Janitor = {}
Janitor.__index = Janitor

function Janitor.new(): Janitor
	local self = setmetatable({
		_tasks = {} :: { [any]: string | boolean },
	}, Janitor)
	return (self :: any) :: Janitor
end

function Janitor:Add<T>(task: T, methodName: string?): T
	local tasks = (self :: any)._tasks
	tasks[task] = methodName or true
	return task
end

function Janitor:Remove(task: CleanupTask)
	local tasks = (self :: any)._tasks
	tasks[task] = nil
end

function Janitor:Cleanup()
	local tasks = (self :: any)._tasks

	for item, method in pairs(tasks) do
		pcall(function()
			if typeof(item) == "RBXScriptConnection" then
				(item :: RBXScriptConnection):Disconnect()
			elseif typeof(item) == "Instance" then
				(item :: Instance):Destroy()
			elseif typeof(item) == "thread" then
				local status = coroutine.status(item :: thread)
				if status ~= "dead" and item ~= coroutine.running() then
					task.cancel(item :: thread)
				end
			elseif typeof(item) == "function" then
				(item :: () -> ())()
			elseif typeof(item) == "table" then
				local destroyFn = (item :: any)[method == true and "Destroy" or method]
				if typeof(destroyFn) == "function" then
					destroyFn(item)
				end
			end
		end)
		tasks[item] = nil
	end
end

function Janitor:Destroy()
	self:Cleanup()
	setmetatable(self :: any, nil)
end

return Janitor
