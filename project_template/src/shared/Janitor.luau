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

	for task, method in pairs(tasks) do
		pcall(function()
			if typeof(task) == "RBXScriptConnection" then
				(task :: RBXScriptConnection):Disconnect()
			elseif typeof(task) == "Instance" then
				(task :: Instance):Destroy()
			elseif typeof(task) == "thread" then
				local status = coroutine.status(task :: thread)
				if status ~= "dead" then
					task.cancel(task :: thread)
				end
			elseif typeof(task) == "function" then
				(task :: () -> ())()
			elseif typeof(task) == "table" then
				local destroyFn = (task :: any)[method == true and "Destroy" or method]
				if typeof(destroyFn) == "function" then
					destroyFn(task)
				end
			end
		end)
		tasks[task] = nil
	end
end

function Janitor:Destroy()
	self:Cleanup()
	setmetatable(self :: any, nil)
end

return Janitor
